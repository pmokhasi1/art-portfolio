import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  PenTool, 
  Mail, 
  Instagram, 
  X, 
  ChevronRight, 
  Menu, 
  Palette,
  Plus,
  Lock,
  Upload,
  Zap,
  Loader2,
  AlertCircle,
  Settings,
  Trash2,
  Edit3,
  ArrowLeft
} from 'lucide-react';

/**
 * 🚀 PRODUCTION CONFIGURATION
 * Connected to: paritosh-portfolio-40092
 */
const firebaseConfig = {
  apiKey: "AIzaSyA3QvBWv12qeLyK5eL7OXIAcOEt88hGQzU",
  authDomain: "paritosh-portfolio-40092.firebaseapp.com",
  projectId: "paritosh-portfolio-40092",
  storageBucket: "paritosh-portfolio-40092.firebasestorage.app",
  messagingSenderId: "82739654332",
  appId: "1:82739654332:web:219f9175e3793610772ab9",
  measurementId: "G-3669YG5SF9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Collection ID for your personal archive
const appId = 'paritosh-portfolio-live';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [portalTab, setPortalTab] = useState('manage'); 
  const [artPieces, setArtPieces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState('');
  const [syncError, setSyncError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  
  const [newArt, setNewArt] = useState({
    title: '',
    category: 'Stippling',
    url: '',
    desc: '',
    dimensions: '',
    year: new Date().getFullYear().toString()
  });

  // Anonymous Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed:", err);
        setSyncError("Connection failed. Ensure 'Anonymous Auth' is enabled in your Firebase Console.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    setSyncError(null);

    const artCollection = collection(db, 'artifacts', appId, 'public', 'data', 'artwork');
    
    const unsubscribe = onSnapshot(artCollection, 
      (snapshot) => {
        const pieces = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (pieces.length === 0) {
          setArtPieces(DEFAULT_ART);
        } else {
          const sorted = pieces.sort((a, b) => {
             return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          setArtPieces(sorted);
        }
        setIsLoading(false);
      }, 
      (error) => {
        console.error("Firestore error:", error);
        setSyncError("Permission denied. Check your Firestore Rules or refresh the page.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = ['All', 'Stippling', 'Ink on Paper', 'Charcoal', 'Digital Sketch'];

  const filteredArt = activeCategory === 'All' 
    ? artPieces 
    : artPieces.filter(p => p.category === activeCategory);

  const processFile = (file) => {
    if (!file) return;
    setFormError('');
    if (file.size > 850000) {
      setFormError("Image is too large for cloud storage (~800KB limit). Please compress the image.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setNewArt(prev => ({ ...prev, url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const resetForm = () => {
    setNewArt({ title: '', category: 'Stippling', url: '', desc: '', dimensions: '', year: new Date().getFullYear().toString() });
    setEditingId(null);
    setFormError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!user) return;
    if (!newArt.title || !newArt.url) {
      setFormError("Title and Image are required.");
      return;
    }

    setIsUploading(true);
    try {
      if (editingId) {
        const artDoc = doc(db, 'artifacts', appId, 'public', 'data', 'artwork', editingId);
        await updateDoc(artDoc, { ...newArt, updatedAt: new Date().toISOString() });
      } else {
        const artCollection = collection(db, 'artifacts', appId, 'public', 'data', 'artwork');
        await addDoc(artCollection, { ...newArt, createdAt: new Date().toISOString() });
      }
      setIsUploadModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError("Action failed. Verify Firestore rules are set to allow access.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent Action: Remove piece from archive?")) return;
    try {
      const artDoc = doc(db, 'artifacts', appId, 'public', 'data', 'artwork', id);
      await deleteDoc(artDoc);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const startEdit = (piece) => {
    setNewArt({ ...piece });
    setEditingId(piece.id);
    setPortalTab('add');
  };

  const profileImage = artPieces.length > 0 && !artPieces[0].id.startsWith('d') 
    ? artPieces[0].url 
    : "https://images.unsplash.com/photo-1513364776144-60967b0f800f";

  return (
    <div className="min-h-screen bg-black text-stone-100 font-sans selection:bg-white selection:text-black">
      
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/90 backdrop-blur-md py-4 border-b border-stone-900' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-left">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <PenTool className="text-white group-hover:rotate-12 transition-transform" size={28} strokeWidth={1.5} />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold tracking-tighter uppercase">Paritosh Mokhasi</span>
              <span className="text-[10px] tracking-[0.4em] text-stone-500 uppercase italic">Visual Artist</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <NavItem label="Portfolio" href="#gallery" />
            <NavItem label="About" href="#about" />
            <button 
              onClick={() => { setIsUploadModalOpen(true); setPortalTab('manage'); }}
              className="ml-4 p-2 text-stone-500 hover:text-white transition-colors flex items-center gap-2 group/manage"
            >
              <Settings size={18} />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 group-hover/manage:text-white">Portal</span>
            </button>
            <a href="#contact" className="ml-4 px-6 py-2 border border-white text-white font-medium rounded-full hover:bg-white hover:text-black transition-all text-sm">
              Inquire
            </a>
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800/20 via-black to-black"></div>
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <p className="text-stone-500 font-mono tracking-[0.5em] uppercase mb-8 text-xs sm:text-sm">Contemporary Visual Art</p>
          <h1 className="text-6xl md:text-9xl font-bold mb-10 tracking-tighter leading-[0.8] text-white uppercase">
            The Metric <br />
            <span className="italic font-serif font-light text-stone-400 lowercase">of Light</span>
          </h1>
          <a href="#gallery" className="group flex items-center gap-3 text-lg font-medium hover:text-stone-400 transition-colors mx-auto w-fit">
            Explore Archive <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 px-6 max-w-7xl mx-auto min-h-[500px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="text-left">
            <h2 className="text-4xl font-bold mb-4 tracking-tight uppercase">Selected Works</h2>
            <p className="text-stone-500 max-w-md">The architecture of silence, point by point.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-all ${
                  activeCategory === cat ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-stone-500 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-[10px] uppercase tracking-widest font-bold">Synchronizing Archive...</p>
          </div>
        ) : syncError ? (
          <div className="py-20 text-center border border-stone-900 rounded-lg">
             <AlertCircle size={32} className="mx-auto text-stone-700 mb-4" />
             <p className="text-stone-500 font-mono text-xs max-w-xs mx-auto">{syncError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
            {filteredArt.map((piece) => (
              <div key={piece.id} className="group cursor-pointer" onClick={() => setSelectedImage(piece)}>
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-900 mb-6 ring-1 ring-stone-800">
                  <img src={piece.url} alt={piece.title} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 group-hover:opacity-80 grayscale" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <span className="text-white text-[10px] uppercase tracking-[0.3em] font-bold border border-white/20 px-4 py-2">View Detail</span>
                  </div>
                </div>
                <div className="flex justify-between items-start px-1">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:underline underline-offset-4 uppercase tracking-tighter">{piece.title}</h3>
                    <p className="text-stone-500 text-sm italic">{piece.category}, {piece.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About Section */}
      <section id="about" className="py-32 border-y border-stone-900 text-left">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-12 gap-16 items-start">
          <div className="md:col-span-5 relative">
            <div className="aspect-[4/5] bg-stone-900 ring-1 ring-stone-800 overflow-hidden grayscale group">
               <img src={profileImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700" alt="Artist Profile" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-r border-b border-stone-700 pointer-events-none"></div>
          </div>
          <div className="md:col-span-7">
            <h2 className="text-sm font-mono tracking-[0.5em] text-stone-500 uppercase mb-6">Profile</h2>
            <h3 className="text-4xl font-bold mb-8 leading-tight uppercase tracking-tighter">Paritosh Mokhasi</h3>
            <div className="space-y-6 text-stone-400 text-lg leading-relaxed">
              <p>I am a visual artist specializing in high-contrast hand-drawn works. My practice centers on stippling—a meticulous process where thousands of points reveal light within the void.</p>
              <p>By inverting the traditional drawing process—beginning with a black substrate and "drawing the light"—I explore the tension between absolute darkness and emerging form. Each piece is a silent meditation, an architecture built point by point.</p>
              <div className="pt-8 flex flex-wrap gap-8">
                <div className="flex items-center gap-2 text-white"><Palette size={20} className="text-stone-500" /><span className="text-sm font-bold uppercase tracking-tighter">Monochrome</span></div>
                <div className="flex items-center gap-2 text-white"><Zap size={20} className="text-stone-500" /><span className="text-sm font-bold uppercase tracking-tighter">Analog</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 text-left">
          <div className="max-w-4xl w-full bg-stone-900 rounded-lg border border-stone-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-stone-800">
              <div className="flex gap-8">
                <button onClick={() => { setPortalTab('manage'); resetForm(); }} className={`text-xl font-bold transition-all ${portalTab === 'manage' ? 'text-white border-b-2 border-white pb-1' : 'text-stone-600 hover:text-stone-400'}`}>Archive</button>
                <button onClick={() => setPortalTab('add')} className={`text-xl font-bold transition-all ${portalTab === 'add' ? 'text-white border-b-2 border-white pb-1' : 'text-stone-600 hover:text-stone-400'}`}>{editingId ? 'Edit Piece' : 'Add New'}</button>
              </div>
              <button onClick={() => { setIsUploadModalOpen(false); resetForm(); }}><X size={24} /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 scrollbar-hide text-left">
              {portalTab === 'manage' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artPieces.map(piece => (
                    <div key={piece.id} className="bg-black/40 border border-stone-800 rounded-lg overflow-hidden flex flex-col group relative">
                      <div className="aspect-[4/3] relative overflow-hidden bg-stone-900">
                        <img src={piece.url} className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 transition-opacity" alt={piece.title} />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(piece)} className="p-2 bg-black/80 text-white rounded-full hover:bg-white hover:text-black transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(piece.id)} className="p-2 bg-black/80 text-white rounded-full hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-white text-sm truncate uppercase tracking-tighter">{piece.title}</h4>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setPortalTab('add')} className="aspect-[4/3] border-2 border-dashed border-stone-800 rounded-lg flex flex-col items-center justify-center text-stone-700 hover:text-white hover:border-white transition-all bg-black/20">
                    <Plus size={32} />
                    <span className="text-[10px] uppercase font-bold mt-2">New Work</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto">
                  {editingId && <button onClick={() => { setPortalTab('manage'); resetForm(); }} className="flex items-center gap-2 text-stone-500 hover:text-white text-xs uppercase font-bold mb-6 transition-colors"><ArrowLeft size={14} /> Back to Archive</button>}
                  <form onSubmit={handleUpload} className="space-y-6">
                    {formError && <div className="p-4 bg-red-950/20 border border-red-900 text-red-400 text-xs rounded-lg flex items-center gap-3"><AlertCircle size={16} />{formError}</div>}
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold ml-1">Work Title</label>
                      <input required type="text" className="w-full bg-black border border-stone-800 p-3 rounded-lg outline-none focus:border-white transition-all text-white" value={newArt.title} onChange={e => setNewArt({...newArt, title: e.target.value})} />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold ml-1">Artwork Image</label>
                      <div onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group/drop ${isDragging ? 'border-white bg-white/10' : 'border-stone-800 hover:border-stone-500 hover:bg-white/5'}`}>
                        {newArt.url ? <img src={newArt.url} className="max-h-48 mx-auto object-contain rounded opacity-80" alt="Preview" /> : <div className="text-center"><Upload className="mx-auto text-stone-700 mb-2" size={32} /><span className="text-[10px] text-stone-500 uppercase font-bold">Select File</span></div>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Category</label>
                        <select className="w-full bg-black border border-stone-800 p-3 rounded-lg h-[46px] outline-none focus:border-white text-white" value={newArt.category} onChange={e => setNewArt({...newArt, category: e.target.value})}>
                          {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Year</label>
                        <input type="text" className="w-full bg-black border border-stone-800 p-3 rounded-lg outline-none focus:border-white transition-all text-white" value={newArt.year} onChange={e => setNewArt({...newArt, year: e.target.value})} />
                      </div>
                    </div>
                    <button type="submit" disabled={isUploading || !user} className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-stone-200 transition-all shadow-xl shadow-white/5 disabled:opacity-50">
                      {isUploading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : editingId ? 'Update Masterpiece' : 'Publish to Collection'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Viewer */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-sm flex items-center justify-center p-6 text-left">
          <button className="absolute top-8 right-8 text-white hover:rotate-90 transition-transform z-[110]" onClick={() => setSelectedImage(null)}><X size={40} strokeWidth={1} /></button>
          <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-16 items-center">
            <div className="w-full lg:w-3/5">
              <img src={selectedImage.url} alt={selectedImage.title} className="w-full h-auto max-h-[85vh] object-contain shadow-2xl border border-stone-800" />
            </div>
            <div className="w-full lg:w-2/5 pt-4 text-left">
              <span className="text-stone-500 font-mono text-xs uppercase tracking-widest block mb-4">{selectedImage.category}</span>
              <h3 className="text-5xl font-bold text-white mb-6 tracking-tighter uppercase">{selectedImage.title}</h3>
              <div className="h-1 w-20 bg-white mb-8"></div>
              <p className="text-stone-400 text-xl leading-relaxed mb-8 italic">"{selectedImage.desc || 'Points in silence.'}"</p>
              <button className="w-full px-8 py-4 bg-white text-black font-bold hover:bg-stone-200 transition-all uppercase tracking-widest text-xs">Inquire for Acquisition</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ label, href }) => (
  <div className="relative group">
    <a href={href} className="text-stone-400 hover:text-white transition-colors duration-300 font-medium px-4 py-2 flex items-center gap-2 text-sm">{label}</a>
  </div>
);

const DEFAULT_ART = [
  { id: 'd1', category: 'Stippling', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5', title: 'Cellular Resonance', desc: 'Hand-applied points on black archival paper.', dimensions: '18" x 24"', year: '2023', createdAt: '2023-01-01T00:00:00Z' }
];

// 🚀 STARTUP LOGIC: Renders the app into the HTML "root" div
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
