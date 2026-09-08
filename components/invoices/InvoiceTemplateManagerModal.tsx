'use client';

import React, { useState, useEffect } from 'react';
import { X, LayoutTemplate, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { InvoiceTemplateDTO } from '@/modules/invoices';
import {
  fetchInvoiceTemplatesAction,
  createInvoiceTemplateAction,
  deleteInvoiceTemplateAction,
} from '@/app/actions/invoices';

interface InvoiceTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceTemplateManagerModal({ isOpen, onClose }: InvoiceTemplateManagerModalProps) {
  const [templates, setTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [brandColor, setBrandColor] = useState('#22333b');
  const [accentColor, setAccentColor] = useState('#a9927d');
  const [layoutStyle, setLayoutStyle] = useState<'classic' | 'modern' | 'minimalist' | 'corporate'>('classic');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoiceTemplatesAction();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createInvoiceTemplateAction({
        name: name.trim(),
        layoutStyle,
        brandColor,
        accentColor,
        headerText: headerText.trim() || undefined,
        footerText: footerText.trim() || undefined,
        paymentInstructions: paymentInstructions.trim() || undefined,
        notes: notes.trim() || undefined,
        isDefault,
      });
      setShowCreateForm(false);
      setName('');
      loadTemplates();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteInvoiceTemplateAction(id);
      loadTemplates();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141419] border border-[#2a2a35] rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2a2a35] flex items-center justify-between bg-[#191922]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#a9927d]/10 text-[#a9927d] rounded-xl border border-[#a9927d]/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Invoice Templates</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage default branding and payment instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#2a2a35] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {!showCreateForm ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Available Templates ({templates.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="gap-1.5 text-xs text-[#a9927d] border-[#a9927d]/30"
                >
                  <Plus className="w-3.5 h-3.5" /> New Template
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500 border border-dashed border-[#2a2a35] rounded-xl">
                  No custom templates configured yet. Default workspace styling is active.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 bg-[#181820] border border-[#2a2a35] rounded-xl space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{tpl.name}</span>
                            {tpl.isDefault && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#a9927d]/20 text-[#a9927d] font-semibold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 capitalize">
                            Layout: {tpl.layoutStyle}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-gray-400 space-y-1 border-t border-[#2a2a35] pt-2">
                        {tpl.headerText && <div>Header: {tpl.headerText}</div>}
                        {tpl.paymentInstructions && (
                          <div className="line-clamp-2 text-gray-400">Payment: {tpl.paymentInstructions}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Create Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Commercial"
                    className="w-full bg-[#181820] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Layout Style</label>
                  <select
                    value={layoutStyle}
                    onChange={(e: any) => setLayoutStyle(e.target.value)}
                    className="w-full bg-[#181820] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-xs"
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Brand Main Color</label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-full h-9 bg-[#181820] border border-[#2a2a35] rounded-lg p-1 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Brand Accent Color</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full h-9 bg-[#181820] border border-[#2a2a35] rounded-lg p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Header Text / Tagline</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Professional Real Estate & Property Services"
                  className="w-full bg-[#181820] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Default Payment Instructions</label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="BSB, Account number, payment reference details..."
                  className="w-full bg-[#181820] border border-[#2a2a35] rounded-lg p-2.5 text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultTemplate"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-[#2a2a35] text-[#a9927d] focus:ring-[#a9927d]"
                />
                <label htmlFor="defaultTemplate" className="text-xs text-gray-300 cursor-pointer">
                  Set as workspace default template
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a35]">
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-[#a9927d] text-[#141419] font-bold"
                >
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a35] bg-[#191922] flex items-center justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
