import { NextRequest } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { BUILT_IN_TEMPLATES } from "@/lib/builtInTemplates";

const prisma = new PrismaClient();

// GET - Fetch all templates (built-ins + user's custom templates)
export async function GET(req: NextRequest) {
  // Check authentication
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    // Get user's custom templates from database
    const customTemplates = await prisma.promptTemplate.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "asc" }
    });

    // Return both built-in and custom templates
    return new Response(JSON.stringify({
      builtIn: BUILT_IN_TEMPLATES,
      custom: customTemplates
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching prompt templates:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch templates" }), {
      status: 500,
    });
  }
}

// POST - Create a new custom template
export async function POST(req: NextRequest) {
  // Check authentication
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const { name, prompt } = body;

    // Validate required fields
    if (!name || !prompt) {
      return new Response(JSON.stringify({ error: "Name and prompt are required" }), {
        status: 400,
      });
    }

    // Create new template
    const template = await prisma.promptTemplate.create({
      data: {
        userId: auth.userId,
        name: name.trim(),
        prompt: prompt.trim(),
      },
    });

    return new Response(JSON.stringify(template), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error creating prompt template:", error);
    return new Response(JSON.stringify({ error: "Failed to create template" }), {
      status: 500,
    });
  }
}

// PUT - Update an existing custom template
export async function PUT(req: NextRequest) {
  // Check authentication
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const { id, name, prompt } = body;

    // Validate required fields
    if (!id || !name || !prompt) {
      return new Response(JSON.stringify({ error: "ID, name and prompt are required" }), {
        status: 400,
      });
    }

    // Update template (only if it belongs to the user)
    const template = await prisma.promptTemplate.updateMany({
      where: { 
        id: id,
        userId: auth.userId  // Ensure user can only update their own templates
      },
      data: {
        name: name.trim(),
        prompt: prompt.trim(),
      },
    });

    // Check if template was found and updated
    if (template.count === 0) {
      return new Response(JSON.stringify({ error: "Template not found or access denied" }), {
        status: 404,
      });
    }

    // Fetch and return the updated template
    const updatedTemplate = await prisma.promptTemplate.findUnique({
      where: { id: id }
    });

    return new Response(JSON.stringify(updatedTemplate), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating prompt template:", error);
    return new Response(JSON.stringify({ error: "Failed to update template" }), {
      status: 500,
    });
  }
}

// DELETE - Delete a custom template
export async function DELETE(req: NextRequest) {
  // Check authentication
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Template ID is required" }), {
        status: 400,
      });
    }

    // Delete template (only if it belongs to the user)
    const result = await prisma.promptTemplate.deleteMany({
      where: { 
        id: id,
        userId: auth.userId  // Ensure user can only delete their own templates
      },
    });

    // Check if template was found and deleted
    if (result.count === 0) {
      return new Response(JSON.stringify({ error: "Template not found or access denied" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error deleting prompt template:", error);
    return new Response(JSON.stringify({ error: "Failed to delete template" }), {
      status: 500,
    });
  }
}