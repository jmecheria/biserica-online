// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDjQEkuNvLHWwBJsGWmu1LxLcOoS75pFjQ",
  authDomain: "biserica-online-d3f0a.firebaseapp.com",
  projectId: "biserica-online-d3f0a",
  storageBucket: "biserica-online-d3f0a.firebasestorage.app",
  messagingSenderId: "582958004765",
  appId: "1:582958004765:web:60a31c374b9e298c1964f4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ===== AUTH =====
export const loginAdmin = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutAdmin = () => signOut(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// ===== PRODUCTS =====
export const getProducts = async () => {
  const snap = await getDocs(query(collection(db, 'produse'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getProduct = async (id) => {
  const snap = await getDoc(doc(db, 'produse', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addProduct = async (data) => addDoc(collection(db, 'produse'), { ...data, createdAt: serverTimestamp() });

export const updateProduct = async (id, data) => updateDoc(doc(db, 'produse', id), data);

export const deleteProduct = async (id) => deleteDoc(doc(db, 'produse', id));

// ===== ANNOUNCEMENTS =====
export const getAnnouncements = async () => {
  const snap = await getDocs(query(collection(db, 'anunturi'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addAnnouncement = async (data) => addDoc(collection(db, 'anunturi'), { ...data, createdAt: serverTimestamp() });

export const updateAnnouncement = async (id, data) => updateDoc(doc(db, 'anunturi', id), data);

export const deleteAnnouncement = async (id) => deleteDoc(doc(db, 'anunturi', id));

// ===== ORDERS =====
export const getOrders = async () => {
  const snap = await getDocs(query(collection(db, 'comenzi'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getOrder = async (id) => {
  const snap = await getDoc(doc(db, 'comenzi', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addOrder = async (data) => addDoc(collection(db, 'comenzi'), { ...data, createdAt: serverTimestamp(), status: 'noua' });

export const updateOrder = async (id, data) => updateDoc(doc(db, 'comenzi', id), data);

export const deleteOrder = async (id) => deleteDoc(doc(db, 'comenzi', id));

// ===== STORAGE =====
export const uploadImage = async (file, path) => {
  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, file);
  return getDownloadURL(snap.ref);
};

export const deleteImage = async (url) => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (e) { console.warn('Delete image error:', e); }
};

export { db, storage, auth };
