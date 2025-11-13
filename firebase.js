// js/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyA7pH4XYXYVTFV6wpiP9rUETsTFhQmPsWk",
  authDomain: "mvpcu01-ebdea.firebaseapp.com",
  databaseURL: "https://mvpcu01-ebdea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mvpcu01-ebdea",
  storageBucket: "mvpcu01-ebdea.firebasestorage.app",
  messagingSenderId: "347908782931",
  appId: "1:347908782931:web:99f563d65c36fe6f9c3fa6",
  measurementId: "G-KZ2T5W9RSX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
