import React, { useState, useRef } from 'react';
import { uploadStandalonePhoto } from '../services/dbService';
import { compressImage } from '../utils/imageCompressor';
import { UploadCloud, CheckCircle, Image as ImageIcon, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PhotoUploadSection() {
  const [photos, setPhotos] = useState<{ file: File; preview: string; compressedBase64?: string }[]>([]);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderNote, setUploaderNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (filesList: FileList) => {
    const validImages = Array.from(filesList).filter(f => f.type.startsWith('image/'));
    
    const newPhotos = await Promise.all(
      validImages.map(async (file) => {
        const preview = URL.createObjectURL(file);
        
        // Compress the image immediately on selection to base64
        let compressedBase64 = '';
        try {
          compressedBase64 = await compressImage(file, 800, 0.7);
        } catch (err) {
          console.error('Compression failed for', file.name, err);
        }

        return {
          file,
          preview,
          compressedBase64
        };
      })
    );

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleSendToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      alert('Please upload at least one image first.');
      return;
    }

    setUploading(true);
    try {
      // Loop over and upload each image
      await Promise.all(
        photos.map(async (photo) => {
          if (photo.compressedBase64) {
            await uploadStandalonePhoto({
              name: uploaderName.trim() || 'Anonymous Student',
              note: uploaderNote.trim(),
              fileName: photo.file.name,
              size: (photo.file.size / 1024).toFixed(1) + ' KB',
              dataUrl: photo.compressedBase64
            });
          }
        })
      );

      // Reset
      setPhotos([]);
      setUploaderName('');
      setUploaderNote('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to send image data to dashboard. Please check your network connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section id="upload-section" className="py-20 bg-[#020b18] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            📸 Upload Assignment Reference
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Drag, drop, or browse your assignment screenshots or lab pages. They go straight to the admin dashboard instantly!
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                key="success"
                className="bg-[#071628] border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl shadow-emerald-500/5"
              >
                <div className="text-5xl">✅</div>
                <h3 className="font-syne text-lg font-bold text-emerald-400">Photos Sent Successfully!</h3>
                <p className="text-[#7da3cc] text-sm max-w-[420px] mx-auto leading-relaxed">
                  Your reference files have been delivered to our administrative portal. We will review them and message you on WhatsApp shortly to confirm details.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 bg-transparent border border-[#0d2d50] text-[#7da3cc] hover:text-white rounded-xl text-xs font-semibold cursor-pointer duration-200"
                >
                  Upload Another Photo
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSendToAdmin} className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl">
                {/* Drag and drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#0d2d50] hover:border-[#1a6fff] bg-[#040f1e] rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-[#1a6fff]/10 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform text-[#1a6fff]">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-syne text-sm font-bold text-white">Click or Drag &amp; Drop Photo</h4>
                    <p className="text-[#7da3cc] text-[10px] mt-1 uppercase tracking-wider font-semibold">
                      JPG, PNG, HEIC — Compressed instantly before send
                    </p>
                  </div>
                </div>

                {/* Thumbnail Preview Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 p-3 border border-[#0d2d50]/60 rounded-xl bg-[#040f1e]">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square border border-[#0d2d50] rounded-lg overflow-hidden group">
                        <img src={photo.preview} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/75 hover:bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={uploaderName}
                      onChange={(e) => setUploaderName(e.target.value)}
                      placeholder="Enter name (optional)"
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 text-white text-xs focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Note / Description
                    </label>
                    <input
                      type="text"
                      value={uploaderNote}
                      onChange={(e) => setUploaderNote(e.target.value)}
                      placeholder="e.g., Q2 from physics lab workbook"
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 text-white text-xs focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || photos.length === 0}
                  className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3.5 rounded-xl font-bold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    'Sending reference images...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Admin Portal
                    </>
                  )}
                </button>
              </form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
