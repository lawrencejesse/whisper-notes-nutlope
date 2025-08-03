// Built-in transformation templates that are available to all users
// These correspond to the original RECORDING_TYPES but include the actual prompt text

export interface BuiltInTemplate {
  name: string;      // Display name (e.g., "Summary")
  value: string;     // Unique identifier (e.g., "summary") 
  prompt: string;    // The actual prompt instruction sent to the LLM
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Summary",
    value: "summary", 
    prompt: "Return a summary of the transcription with a maximum of 100 words."
  },
  {
    name: "Quick Note",
    value: "quick-note",
    prompt: "Return a quick post it style note."
  },
  {
    name: "List", 
    value: "list",
    prompt: "Return a list of bullet points of the transcription main points."
  },
  {
    name: "Blog post",
    value: "blog",
    prompt: "Return the Markdown of entire blog post with subheadings"
  },
  {
    name: "Email",
    value: "email", 
    prompt: "If type is email also generate an email subject line and a short email body with introductory paragraph and a closing paragraph for thanking the reader for reading."
  }
];

// Helper function to get a built-in template by value
export function getBuiltInTemplate(value: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(template => template.value === value);
}

// Helper function to check if a value is a built-in template
export function isBuiltInTemplate(value: string): boolean {
  return BUILT_IN_TEMPLATES.some(template => template.value === value);
}