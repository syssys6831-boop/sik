
import React, { useState, useRef } from 'react';
import { Note, StoredFile } from '../types';
import XIcon from './icons/XIcon';
import FolderIcon from './icons/FolderIcon';
import TrashIcon from './icons/TrashIcon';
import PaperclipIcon from './icons/PaperclipIcon';

interface NoteListProps {
  notes: Note[];
  files: StoredFile[];
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  onAddFile: (file: File) => void;
  onDeleteFile: (id: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  files, 
  isOpen, 
  onClose, 
  onNoteSelect, 
  onDeletePermanent,
  onAddFile,
  onDeleteFile
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'saved' | 'files'>('recent');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNoteClick = (id: string) => {
    onNoteSelect(id);
    onClose();
  };

  const filteredNotes = notes.filter(note => {
    // Filter out empty notes
    if (!note.content || note.content.trim() === '') return false;

    if (activeTab === 'recent') {
      return note.status === 'active' || note.status === 'minimized';
    } else if (activeTab === 'saved') {
      return note.status === 'archived';
    }
    return false;
  });

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this note?")) {
        onDeletePermanent(id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit to ~750KB to safely fit in Firestore 1MB doc with metadata
      if (file.size > 750 * 1024) {
        alert("File is too large. Please upload files smaller than 750KB.");
        return;
      }
      onAddFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-slate-800 shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-200">My Notes</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
            <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'recent' 
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
                Recent
            </button>
            <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'saved' 
                    ? 'text-green-400 border-b-2 border-green-400 bg-slate-700/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
                <FolderIcon className="w-4 h-4" />
                Saved
            </button>
            <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'files' 
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
                <PaperclipIcon className="w-4 h-4" />
                Files
            </button>
        </div>

        <div className="overflow-y-auto flex-grow p-2">
          {activeTab === 'files' ? (
             <div className="flex flex-col h-full">
                <div className="p-2 mb-2">
                   <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded border border-slate-600 flex items-center justify-center gap-2 transition-colors"
                   >
                     <PaperclipIcon className="w-4 h-4" />
                     Upload New File
                   </button>
                   <p className="text-xs text-slate-500 mt-2 text-center">Max size: 750KB (Firestore Limit)</p>
                </div>
                {files.length === 0 ? (
                  <p className="text-center text-slate-500 mt-10">No files uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {files.map(file => (
                      <li key={file.id} className="bg-slate-700/40 border border-slate-600 rounded p-3 flex justify-between items-center group">
                        <div className="flex-1 overflow-hidden mr-2">
                          <p className="text-slate-200 text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.createdAt?.toDate().toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={file.dataUrl} 
                            download={file.name}
                            className="p-1.5 rounded-full text-blue-400 hover:bg-slate-600 transition-colors"
                            title="Download"
                          >
                             <FolderIcon className="w-4 h-4" /> {/* Reusing folder icon as download feel */}
                          </a>
                          <button
                            onClick={() => {
                                if (window.confirm("Delete this file?")) onDeleteFile(file.id);
                            }}
                            className="p-1.5 rounded-full text-red-400 hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          ) : (
             /* Notes List */
             <ul>
               {filteredNotes.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                     <p>{activeTab === 'recent' ? "No active notes." : "No saved notes."}</p>
                 </div>
               ) : (
                 filteredNotes.map(note => (
                   <li key={note.id} className="mb-2">
                     <div
                       className={`w-full rounded-lg overflow-hidden border border-slate-600 bg-slate-700/40 hover:bg-slate-700 transition-all group relative`}
                     >
                       <button 
                         onClick={() => handleNoteClick(note.id)}
                         className="w-full text-left p-3 pb-8 block"
                       >
                         <div className="flex items-center gap-2 mb-1">
                             <div className={`w-3 h-3 rounded-full ${note.color.split(' ')[0]}`}></div>
                             <span className="text-xs text-slate-400 font-mono">
                                 {note.status === 'minimized' ? '(Hidden)' : ''}
                             </span>
                         </div>
                         <p className="text-slate-200 text-sm line-clamp-2 font-medium">
                             {note.content}
                         </p>
                         <p className="text-xs text-slate-500 mt-2">
                             {note.lastEdited?.toDate().toLocaleString()}
                         </p>
                       </button>
                       
                       <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                           <button
                             onClick={(e) => handleDeleteClick(e, note.id)}
                             className="p-1.5 rounded-full bg-slate-800 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors shadow-sm"
                             title="Delete Permanently"
                           >
                             <TrashIcon className="w-4 h-4" />
                           </button>
                       </div>
                     </div>
                   </li>
                 ))
               )}
             </ul>
          )}
        </div>
      </aside>
    </>
  );
};

export default NoteList;
