import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import getDoc from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
const firebaseConfig = {
    apiKey: "AIzaSyCB6U9js8IMNaQm3cGpR9W-KfJTLVVS85A",
    authDomain: "sft-v2.firebaseapp.com",
    projectId: "sft-v2",
    storageBucket: "sft-v2.appspot.com",
    messagingSenderId: "246083377922",
    appId: "1:246083377922:web:0cba7bfdd8733f9f75401b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const code1 = await getDoc(doc(db, "code", "code"));
const code2 = code1.data() || {};
const code = code2["code"];
const codeinp = document.getElementById("code-inp");
if (codeinp.value == await getDoc(doc(db, "code", "code")).data()["code"]){
    pass;
}
