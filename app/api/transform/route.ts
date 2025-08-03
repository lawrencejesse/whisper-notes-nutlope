import { NextRequest } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { streamText } from "ai";
import { togetherVercelAiClient } from "@/lib/apiClients";
import { RECORDING_TYPES } from "@/lib/utils";
import { getAuth } from "@clerk/nextjs/server";
import { getBuiltInTemplate, isBuiltInTemplate } from "@/lib/builtInTemplates";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient();
  const body = await req.json();
  const { whisperId, typeName, templateId } = body;
  // Auth
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  // Optionally get Together API key from header
  const apiKey = req.headers.get("TogetherAPIToken") || undefined;

  // Find whisper
  const whisper = await prisma.whisper.findUnique({ where: { id: whisperId } });
  if (!whisper) {
    return new Response(JSON.stringify({ error: "Whisper not found" }), {
      status: 404,
    });
  }

  // Determine which template to use and get the prompt text
  let templateName = "";
  let promptInstruction = "";

  if (templateId) {
    // Using a custom template
    const customTemplate = await prisma.promptTemplate.findFirst({
      where: { 
        id: templateId,
        userId: auth.userId  // Ensure user can only access their own templates
      }
    });
    
    if (!customTemplate) {
      return new Response(JSON.stringify({ error: "Template not found or access denied" }), {
        status: 404,
      });
    }
    
    templateName = customTemplate.name;
    promptInstruction = customTemplate.prompt;
  } else if (typeName && isBuiltInTemplate(typeName)) {
    // Using a built-in template
    const builtInTemplate = getBuiltInTemplate(typeName);
    if (!builtInTemplate) {
      return new Response(JSON.stringify({ error: "Built-in template not found" }), {
        status: 404,
      });
    }
    
    templateName = builtInTemplate.name;
    promptInstruction = builtInTemplate.prompt;
  } else {
    return new Response(JSON.stringify({ error: "Either templateId or valid typeName is required" }), {
      status: 400,
    });
  }

  // Create transformation in DB (store the template name used)
  const transformation = await prisma.transformation.create({
    data: {
      whisperId,
      typeName: templateId ? templateName : typeName, // Store template name for custom templates
      text: "",
      isGenerating: true,
    },
  });

  // Prepare the full prompt for the LLM
  const prompt = `
  You are a helpful assistant. You will be given a transcription of an audio recording and you will generate a ${templateName} based on the transcription with markdown formatting. 
  Only output the generation itself, with no introductions, explanations, or extra commentary.
  
  The transcription is: ${whisper.fullTranscription}

  ${promptInstruction}

  Remember to use output language like the input transcription language.

  Do not add phrases like "Based on the transcription" or "Let me know if you'd like me to help with anything else."
  `;

  // Start streaming
  const aiClient = togetherVercelAiClient(apiKey);
  const { textStream } = streamText({
    model: aiClient("meta-llama/Meta-Llama-3-70B-Instruct-Turbo"),
    prompt,
  });

  // Create a ReadableStream to send id first, then stream text
  let fullText = "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send the id as a JSON object first
      controller.enqueue(
        encoder.encode(JSON.stringify({ id: transformation.id }) + "\n")
      );
      // Stream the text
      for await (const chunk of textStream) {
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      // Update DB at the end
      await prisma.transformation.update({
        where: { id: transformation.id },
        data: { text: fullText, isGenerating: false },
      });
      controller.close();
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
