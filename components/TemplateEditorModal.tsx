import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define interfaces for our template data
interface CustomTemplate {
  id: string;
  name: string;
  prompt: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesUpdated?: () => void;
}

export function TemplateEditorModal({ 
  isOpen, 
  onClose, 
  onTemplatesUpdated 
}: TemplateEditorModalProps) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state for editing/creating templates
  const [formData, setFormData] = useState({
    name: "",
    prompt: ""
  });

  // Fetch user's custom templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompt-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.custom || []);
      } else {
        console.error('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Handle create new template
  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({ name: "", prompt: "" });
  };

  // Handle edit template
  const handleEdit = (template: CustomTemplate) => {
    setIsCreating(false);
    setEditingTemplate(template);
    setFormData({ 
      name: template.name, 
      prompt: template.prompt 
    });
  };

  // Handle save template (create or update)
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert("Please fill in both name and prompt fields.");
      return;
    }

    try {
      const url = '/api/prompt-templates';
      const method = isCreating ? 'POST' : 'PUT';
      const body = isCreating 
        ? { name: formData.name, prompt: formData.prompt }
        : { id: editingTemplate?.id, name: formData.name, prompt: formData.prompt };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        // Refresh templates list
        await fetchTemplates();
        // Reset form
        setIsCreating(false);
        setEditingTemplate(null);
        setFormData({ name: "", prompt: "" });
        // Notify parent component
        onTemplatesUpdated?.();
      } else {
        alert('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  // Handle delete template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompt-templates?id=${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh templates list
        await fetchTemplates();
        // Reset form if we were editing this template
        if (editingTemplate?.id === templateId) {
          setEditingTemplate(null);
          setIsCreating(false);
          setFormData({ name: "", prompt: "" });
        }
        // Notify parent component
        onTemplatesUpdated?.();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormData({ name: "", prompt: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="!max-w-none !w-auto !h-auto overflow-auto p-0"
        style={{ 
          width: '90vw',
          height: '80vh',
          minWidth: '800px', 
          minHeight: '600px',
          maxWidth: 'none',
          maxHeight: 'none',
          resize: 'both',
          overflow: 'auto',
          display: 'block'
        }}
      >
        <DialogTitle className="sr-only">Manage Templates</DialogTitle>
        {/* Custom resizable container */}
        <div className="w-full h-full flex flex-col bg-white rounded-lg relative" style={{ minHeight: '600px' }}>
          {/* Resize indicator */}
          <div className="absolute bottom-0 right-0 w-4 h-4 opacity-30 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 22H2v-2h18V4h2v18zM4 20v-2h2v2H4zm4 0v-2h2v2H8zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2z"/>
              <path d="M20 18v-2h2v2h-2zm0-4v-2h2v2h-2zm0-4v-2h2v2h-2zm0-4V4h2v2h-2z"/>
            </svg>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold flex items-center justify-between">
              Manage Templates
              <span className="text-xs text-slate-500 font-normal">
                Drag the bottom-right edge or corner to resize
              </span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-hidden flex gap-6 p-6">
            {/* Left side - Templates list */}
            <div className="w-1/3 border-r pr-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">My Templates</h3>
              <button
                onClick={handleCreate}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                + New Template
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {loading ? (
                <div className="text-slate-500">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="text-slate-500 text-sm">No custom templates yet</div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${
                      editingTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                    onClick={() => handleEdit(template)}
                  >
                    <div className="font-medium text-sm mb-2">{template.name}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      {template.prompt.length > 80 
                        ? `${template.prompt.substring(0, 80)}...` 
                        : template.prompt
                      }
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right side - Editor */}
          <div className="flex-1 flex flex-col">
            {(isCreating || editingTemplate) ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">
                    {isCreating ? 'Create New Template' : 'Edit Template'}
                  </h3>
                  {editingTemplate && (
                    <button
                      onClick={() => handleDelete(editingTemplate.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                      placeholder="e.g., Professional Email Style"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium mb-2">
                      Prompt Instructions
                      <span className="text-xs text-slate-500 ml-2">
                        (Write detailed instructions for how to transform the transcription)
                      </span>
                    </label>
                    <textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                      className="flex-1 p-3 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                      style={{ minHeight: '300px' }}
                      placeholder="Enter detailed instructions for how to transform the transcription...

Example:
'Transform this transcription into a professional email with:
- A clear subject line
- Formal greeting and closing
- Well-structured paragraphs
- Professional tone throughout'

You can be as detailed as needed - the AI will follow your specific instructions."
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {isCreating ? 'Create' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="mb-2">Select a template to edit</div>
                  <div className="text-sm">or click "New" to create one</div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}