import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Upload, FileText, Download, Sparkles, Zap, BookOpen, 
  ChevronRight, Loader2, CheckCircle, AlertCircle, X,
  Eye, FileDown, Copy, RotateCcw, GraduationCap, Brain,
  Lightbulb, HelpCircle, Layers, Image as ImageIcon,
  History, Clock, Edit2, Save, Menu, Settings, Wand2,
  Trash2, Send, Bold, Italic, Link, List, Globe, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Animation variants
const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [docId, setDocId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [style, setStyle] = useState('structured');
  const [activeTab, setActiveTab] = useState('notes');
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState(() => {
    const saved = localStorage.getItem('omninotes_api_config');
    return saved ? JSON.parse(saved) : {
      api_key: '',
      base_url: '',
      model: 'gpt-4o-mini',
      provider: 'openai'
    };
  });

  // Selection state
  const [selection, setSelection] = useState({ text: '', rect: null });
  const [isRefining, setIsRefining] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refiningInProgress, setRefiningInProgress] = useState(false);
  const [testStatus, setTestStatus] = useState({ loading: false, message: '', type: '' });

  useEffect(() => {
    localStorage.setItem('omninotes_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/history`);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const selectFromHistory = async (id) => {
    setProcessing(true);
    setIsHistoryOpen(false);
    try {
      const response = await axios.get(`${API_URL}/document/${id}`);
      setDocId(id);
      setResult(response.data);
      setStyle(response.data.style);
      setEditedText(response.data.formatted_text);
      setActiveTab('notes');
    } catch (err) {
      setError('Failed to load document. It may have been deleted.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveEdits = async () => {
    try {
      await axios.post(`${API_URL}/update`, {
        doc_id: docId,
        formatted_text: editedText
      });
      setResult(prev => ({ ...prev, formatted_text: editedText }));
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save changes.');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file)
    }))]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    files.forEach(({ file }) => formData.append('files', file));

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setDocId(response.data.doc_id);
      setUploading(false);
      handleProcess(response.data.doc_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const handleProcess = async (id) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/process`, {
        doc_id: id,
        style: style,
        api_config: apiConfig.api_key || apiConfig.base_url ? apiConfig : null
      });

      setResult(response.data);
      setEditedText(response.data.formatted_text);
      setProcessing(false);
      fetchHistory(); // Refresh history
    } catch (err) {
      setError(err.response?.data?.detail || 'Processing failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!selection.text || !refineInstruction) return;
    
    setRefiningInProgress(true);
    try {
      const response = await axios.post(`${API_URL}/refine`, {
        doc_id: docId,
        selection: selection.text,
        instruction: refineInstruction,
        api_config: apiConfig.api_key || apiConfig.base_url ? apiConfig : null
      });

      setResult(prev => ({ ...prev, formatted_text: response.data.full_text }));
      setEditedText(response.data.full_text);
      setSelection({ text: '', rect: null });
      setIsRefining(false);
      setRefineInstruction('');
    } catch (err) {
      setError('Refinement failed. Selection might be too small or not found.');
    } finally {
      setRefiningInProgress(false);
    }
  };

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString(),
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      });
    } else {
      if (!isRefining) setSelection({ text: '', rect: null });
    }
  };

  const handleDownload = async (type) => {
    try {
      const response = await axios.get(`${API_URL}/download/${type}/${docId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `omninotes_${docId?.substr(0, 8)}.${type === 'md' ? 'md' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Download failed. Please try again.');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Testing connection...', type: '' });
    try {
      const response = await axios.post(`${API_URL}/test-connection`, apiConfig);
      if (response.data.status === 'success') {
        setTestStatus({ loading: false, message: response.data.message, type: 'success' });
      } else {
        setTestStatus({ loading: false, message: response.data.message, type: 'error' });
      }
    } catch (err) {
      setTestStatus({ 
        loading: false, 
        message: err.response?.data?.detail || 'Connection failed. Check your settings.', 
        type: 'error' 
      });
    }
    // Clear message after 3 seconds if it was successful
    setTimeout(() => {
      setTestStatus(prev => prev.type === 'success' ? { ...prev, message: '' } : prev);
    }, 3000);
  };

  const copyToClipboard = () => {
    if (result?.formatted_text) {
      navigator.clipboard.writeText(result.formatted_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setDocId(null);
    setResult(null);
    setError(null);
    setActiveTab('notes');
    setUploadProgress(0);
  };

  const styles = [
    { id: 'structured', label: 'Structured Notes', icon: FileText, desc: 'Well-organized with headings and bullets' },
    { id: 'summary', label: 'Summary', icon: Sparkles, desc: 'Concise overview with key points' },
    { id: 'flashcards', label: 'Flashcards', icon: Brain, desc: 'Study cards for memorization' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, desc: 'Test your knowledge' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-muted flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Omni<span className="gradient-text">Notes</span> AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
              title="API Settings (BYOD)"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-white/10 hidden sm:block" />
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white transition-all hidden sm:flex"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
            <div className="w-px h-5 bg-white/10 hidden sm:block" />
            <span className="text-xs text-gray-500 font-mono">v1.2</span>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="settings-modal" 
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white mb-0.5">Settings</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">API Gateway Configuration</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Provider Selection */}
              <div className="mb-6">
                <label className="input-label">AI Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'openai', label: 'OpenAI', icon: Sparkles },
                    { id: 'anthropic', label: 'Claude', icon: Brain },
                    { id: 'custom', label: 'Local', icon: Layers },
                  ].map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => setApiConfig({...apiConfig, provider: p.id})}
                      className={`provider-card ${apiConfig.provider === p.id ? 'active' : ''}`}
                    >
                      <p.icon className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Fields */}
              <div className="space-y-4">
                <div className="input-group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="input-label mb-0">API Credentials</label>
                    <button 
                      onClick={handleTestConnection}
                      disabled={testStatus.loading || !apiConfig.api_key}
                      className="test-btn"
                    >
                      {testStatus.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      <span>{testStatus.type === 'success' ? 'Verified' : 'Test Key'}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Link className="w-4 h-4" />
                      </div>
                      <input 
                        type="password" 
                        value={apiConfig.api_key} 
                        onChange={e => setApiConfig({...apiConfig, api_key: e.target.value})}
                        placeholder="API Key (sk-...)" 
                        className="input-field pl-12"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={apiConfig.base_url} 
                        onChange={e => setApiConfig({...apiConfig, base_url: e.target.value})}
                        placeholder="Base URL (Optional)" 
                        className="input-field pl-12"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={apiConfig.model} 
                        onChange={e => setApiConfig({...apiConfig, model: e.target.value})}
                        placeholder="Model Name (e.g. gpt-4o-mini)" 
                        className="input-field pl-12"
                      />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {testStatus.message && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-[10px] mt-3 p-3 rounded-xl flex items-center gap-2 border ${
                          testStatus.type === 'success' 
                            ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                            : 'bg-red-500/5 border-red-500/20 text-red-400'
                        }`}
                      >
                        {testStatus.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span className="font-medium">{testStatus.message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="btn-primary mt-4"
                >
                  Save Changes
                </button>
              </div>
              
              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-[10px] text-gray-500 text-center leading-relaxed max-w-[300px] mx-auto">
                  Keys are stored locally in your browser and never sent to our servers.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selection Toolbar */}
      <AnimatePresence>
        {selection.rect && !isRefining && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            className="selection-toolbar active"
            style={{ 
              top: selection.rect.top - 50, 
              left: selection.rect.left + selection.rect.width / 2 - 80 
            }}
          >
            <button className="p-2 hover:bg-white/10 rounded-lg text-gray-300" title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg text-gray-300" title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => setIsRefining(true)}
              className="magic-btn flex items-center gap-2 px-3 py-1"
            >
              <Wand2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tighter">Magic</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine Popover */}
      <AnimatePresence>
        {isRefining && selection.rect && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed z-[110] bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg"
          >
            <div className="glass rounded-2xl p-4 border border-indigo-500/30 shadow-2xl glow">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Refine Selection</span>
                </div>
                <button onClick={() => setIsRefining(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="relative">
                <input 
                  autoFocus
                  type="text" 
                  value={refineInstruction}
                  onChange={e => setRefineInstruction(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRefine()}
                  placeholder="Ask AI to remove, rewrite, or explain..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                />
                <button 
                  onClick={handleRefine}
                  disabled={!refineInstruction || refiningInProgress}
                  className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-indigo-500 text-white disabled:opacity-30 disabled:grayscale transition-all"
                >
                  {refiningInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 px-2">
                <p className="text-[10px] text-gray-500 italic truncate">
                  Target: "{selection.text.substring(0, 60)}..."
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-[#0d0d14] border-r border-white/5 z-[70] p-6 overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold">History</h2>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                {history.length > 0 ? (
                  history.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => selectFromHistory(doc.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        docId === doc.id 
                          ? 'bg-accent/10 border-accent' 
                          : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1 truncate">
                        {doc.filenames[0] || 'Untitled Document'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-md bg-white/5 uppercase tracking-wider">
                          {doc.style}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-700 mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-gray-500">No history yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        {!result && (
          <motion.section 
            initial="hidden" animate="visible" variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>AI-Powered Note Conversion</span>
            </motion.div>
            <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Turn any image into<br />
              <span className="gradient-text">structured notes</span>
            </motion.h1>
            <motion.p variants={fadeIn} className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              Upload photos of whiteboards, textbooks, handwritten notes, or screenshots. 
              Our AI extracts text, organizes it, and generates beautiful PDFs in seconds.
            </motion.p>
          </motion.section>
        )}

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Panel - Upload */}
          <div className={`${result ? 'lg:col-span-2' : 'lg:col-span-3 lg:col-start-2'}`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="glass rounded-2xl p-6 glow"
            >
              {/* Upload Zone */}
              {!result && (
                <>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-1">Upload Images</h2>
                    <p className="text-sm text-gray-500">Support for JPG, PNG, and PDF files up to 20MB</p>
                  </div>

                  {/* Style Selector */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {styles.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          style === s.id 
                            ? 'border-accent bg-accent/10' 
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <s.icon className={`w-4 h-4 ${style === s.id ? 'text-accent' : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${style === s.id ? 'text-accent' : 'text-white'}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{s.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive ? 'drop-active' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-white font-medium mb-1">
                      {isDragActive ? 'Drop files here...' : 'Drag & drop images here'}
                    </p>
                    <p className="text-sm text-gray-500">or click to browse files</p>
                  </div>
                </>
              )}

              {/* File List */}
              <AnimatePresence>
                {files.length > 0 && !result && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="mt-6 space-y-2"
                  >
                    {files.map(({ file, id, preview }) => (
                      <motion.div 
                        key={id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        {file.type.startsWith('image/') ? (
                          <img src={preview} alt="" className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-accent/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-accent" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => removeFile(id)} className="p-1 hover:bg-white/10 rounded transition-colors">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Progress */}
              {uploading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Uploading...</span>
                    <span className="text-accent font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-accent to-muted rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Process Button */}
              {files.length > 0 && !result && !uploading && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onClick={handleUpload}
                  className="w-full mt-6 py-3 px-6 rounded-xl bg-gradient-to-r from-accent to-accentHover text-white font-semibold 
                           hover:shadow-lg hover:shadow-accent/25 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Notes
                </motion.button>
              )}

              {/* Processing State */}
              {processing && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-6 text-center py-12"
                >
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-accent animate-spin" />
                  </div>
                  <p className="text-lg font-medium mb-1">Processing your notes...</p>
                  <p className="text-sm text-gray-500">Extracting text and applying AI formatting</p>
                  <div className="mt-6 flex justify-center gap-2">
                    {['OCR', 'AI Format', 'PDF Gen'].map((step, i) => (
                      <motion.div 
                        key={step} initial={{ opacity: 0.3 }} 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                        className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400"
                      >
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Reset Button (when result shown) */}
              {result && (
                <button
                  onClick={resetAll}
                  className="w-full py-3 px-6 rounded-xl border border-white/10 text-gray-400 hover:text-white 
                           hover:border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Convert Another
                </button>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Panel - Results */}
          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-3"
              >
                <div className="glass rounded-2xl p-6 h-full">
                  {/* Result Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold">Your Notes</h2>
                      <p className="text-sm text-gray-500">Generated in {style} mode</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2 rounded-lg border transition-all ${
                          isEditing ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                        title={isEditing ? "Cancel editing" : "Edit notes"}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isEditing && (
                        <button
                          onClick={handleSaveEdits}
                          className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                          title="Save changes"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                      <div className="w-px h-5 bg-white/10 mx-1" />
                      <button
                        onClick={copyToClipboard}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                        title="Copy to clipboard"
                      >
                        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                      <button
                        onClick={() => handleDownload('md')}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                        title="Download Markdown"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="px-4 py-2 rounded-lg bg-accent hover:bg-accentHover text-white text-sm font-medium 
                                  transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5 border border-white/10">
                    {[
                      { id: 'notes', label: 'Notes', icon: FileText },
                      { id: 'summary', label: 'Summary', icon: Sparkles },
                      { id: 'keypoints', label: 'Key Points', icon: Lightbulb },
                      ...(result.flashcards?.length ? [{ id: 'flashcards', label: 'Flashcards', icon: Brain }] : []),
                      ...(result.quiz_questions?.length ? [{ id: 'quiz', label: 'Quiz', icon: HelpCircle }] : [])
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          activeTab === tab.id 
                            ? 'bg-accent text-white' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px] max-h-[600px] overflow-y-auto pr-2">
                    {activeTab === 'notes' && (
                      <div 
                        className={`markdown-body h-full min-h-[400px] ${!isEditing ? 'editable' : ''}`}
                        onMouseUp={handleTextSelection}
                        onDoubleClick={() => setIsEditing(true)}
                      >
                        {isEditing ? (
                          <textarea
                            className="note-editor"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            placeholder="Edit your notes here (Markdown supported)..."
                          />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result.formatted_text}
                          </ReactMarkdown>
                        )}
                      </div>
                    )}

                    {activeTab === 'summary' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-accent" />
                            <h3 className="font-semibold">Summary</h3>
                          </div>
                          <p className="text-gray-300 leading-relaxed">{result.summary || 'No summary available.'}</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'keypoints' && (
                      <div className="space-y-3">
                        {result.key_points?.length > 0 ? (
                          result.key_points.map((point, i) => (
                            <motion.div 
                              key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-accent">{i + 1}</span>
                              </div>
                              <p className="text-gray-300">{point}</p>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-8">No key points extracted.</p>
                        )}
                      </div>
                    )}

                    {activeTab === 'flashcards' && (
                      <FlashcardView flashcards={result.flashcards} />
                    )}

                    {activeTab === 'quiz' && (
                      <QuizView questions={result.quiz_questions} />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Features Section */}
        {!result && (
          <motion.section 
            id="features" initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer} className="mt-24"
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why OmniNotes AI?</h2>
              <p className="text-gray-400">Powerful features for students, teachers, and professionals</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: ImageIcon, title: 'Any Image', desc: 'Whiteboards, textbooks, handwritten notes, screenshots' },
                { icon: Zap, title: 'Fast Processing', desc: 'Get structured notes in under 15 seconds' },
                { icon: FileDown, title: 'PDF Export', desc: 'Download beautifully formatted PDF documents' },
                { icon: GraduationCap, title: 'Study Tools', desc: 'Flashcards, quizzes, and key point extraction' }
              ].map((feature, i) => (
                <motion.div 
                  key={i} variants={fadeIn}
                  className="glass rounded-xl p-6 hover:border-accent/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* How It Works */}
        {!result && (
          <motion.section 
            id="how-it-works" initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer} className="mt-24 mb-16"
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-gray-400">Three simple steps to convert your images</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Upload', desc: 'Drag and drop your images or PDFs into the upload zone' },
                { step: '02', title: 'Process', desc: 'Our AI extracts text using OCR and organizes it intelligently' },
                { step: '03', title: 'Download', desc: 'Get your structured notes as PDF or Markdown instantly' }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn} className="relative">
                  <div className="glass rounded-xl p-8 text-center relative z-10">
                    <span className="text-5xl font-bold gradient-text opacity-30">{item.step}</span>
                    <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
                    <p className="text-gray-500">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-0">
                      <ChevronRight className="w-8 h-8 text-accent/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            OmniNotes AI • Built with React, FastAPI, and OCR technology
          </p>
        </div>
      </footer>
    </div>
  );
}

// Flashcard Component
function FlashcardView({ flashcards }) {
  const [flipped, setFlipped] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const toggleFlip = (index) => {
    setFlipped(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (!flashcards?.length) return <p className="text-gray-500 text-center py-8">No flashcards generated.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Card {currentIndex + 1} of {flashcards.length}</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <button 
            onClick={() => setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1))}
            disabled={currentIndex === flashcards.length - 1}
            className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, rotateY: 90 }}
        animate={{ opacity: 1, rotateY: 0 }}
        className="relative h-64 cursor-pointer"
        onClick={() => toggleFlip(currentIndex)}
      >
        <div className={`absolute inset-0 rounded-xl p-6 flex items-center justify-center text-center transition-all duration-500 ${
          flipped[currentIndex] 
            ? 'bg-accent/10 border-2 border-accent' 
            : 'bg-white/5 border border-white/10'
        }`}>
          <div>
            <p className="text-sm text-gray-500 mb-2">{flipped[currentIndex] ? 'Answer' : 'Question'}</p>
            <p className="text-lg font-medium">
              {flipped[currentIndex] ? flashcards[currentIndex].answer : flashcards[currentIndex].question}
            </p>
          </div>
        </div>
      </motion.div>
      <p className="text-center text-sm text-gray-500">Click card to flip</p>
    </div>
  );
}

// Quiz Component
function QuizView({ questions }) {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const selectAnswer = (qIndex, optionIndex) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const score = Object.entries(answers).filter(([qIdx, ans]) => 
    questions[qIdx].correct_answer === ans
  ).length;

  if (!questions?.length) return <p className="text-gray-500 text-center py-8">No quiz questions generated.</p>;

  return (
    <div className="space-y-6">
      {showResults && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-center"
        >
          <p className="text-2xl font-bold gradient-text">{score} / {questions.length}</p>
          <p className="text-sm text-gray-400">Correct Answers</p>
        </motion.div>
      )}

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="font-medium mb-3">{qIdx + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, oIdx) => {
              const isSelected = answers[qIdx] === oIdx;
              const isCorrect = q.correct_answer === oIdx;
              const showCorrect = showResults && isCorrect;
              const showWrong = showResults && isSelected && !isCorrect;

              return (
                <button
                  key={oIdx}
                  onClick={() => selectAnswer(qIdx, oIdx)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    showCorrect ? 'bg-green-500/20 border-green-500/50' :
                    showWrong ? 'bg-red-500/20 border-red-500/50' :
                    isSelected ? 'bg-accent/20 border-accent/50' : 
                    'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-sm">{String.fromCharCode(65 + oIdx)}. {opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!showResults && (
        <button
          onClick={() => setShowResults(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accentHover disabled:opacity-50 text-white font-medium transition-all"
        >
          Check Answers
        </button>
      )}
    </div>
  );
}

export default App;
