import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLhtlUreBHjAr0tMbHMNPM8umAmxWiTPo",
  authDomain: "doapet-b8a55.firebaseapp.com",
  projectId: "doapet-b8a55",
  storageBucket: "doapet-b8a55.firebasestorage.app",
  messagingSenderId: "428930977134",
  appId: "1:428930977134:web:d96019bc0be7623233457f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToClear = ['pets', 'sos_alerts', 'chats'];

async function clearCollection(colName) {
  console.log(`\nConsultando coleção: ${colName}...`);
  try {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    console.log(`Encontrados ${snap.docs.length} documentos em '${colName}'.`);
    
    for (const d of snap.docs) {
      console.log(`Deletando documento ID: ${d.id} em '${colName}'...`);
      // Se for chats, deleta subcoleção messages se houver
      if (colName === 'chats') {
        try {
          const msgSnap = await getDocs(collection(db, 'chats', d.id, 'messages'));
          for (const m of msgSnap.docs) {
            await deleteDoc(doc(db, 'chats', d.id, 'messages', m.id));
          }
        } catch (e) {
          // ignora
        }
      }
      await deleteDoc(doc(db, colName, d.id));
    }
    console.log(`✔ Coleção '${colName}' limpa com sucesso!`);
  } catch (error) {
    console.error(`Erro ao limpar coleção '${colName}':`, error.message);
  }
}

async function run() {
  console.log("Iniciando limpeza do Cloud Firestore (doapet-b8a55)...");
  for (const col of collectionsToClear) {
    await clearCollection(col);
  }
  console.log("\nLimpeza do Firestore concluída!");
  process.exit(0);
}

run();
