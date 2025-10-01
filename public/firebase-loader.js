// Firebase loader script - loads Firebase completely outside of the main bundle
(function() {
  'use strict';
  
  console.log('🔥 Firebase loader script starting...');
  
  // Firebase configuration
  const firebaseConfig = {
    apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
    authDomain: 'neurafit-ai-2025.firebaseapp.com',
    projectId: 'neurafit-ai-2025',
    storageBucket: 'neurafit-ai-2025.firebasestorage.app',
    messagingSenderId: '226392212811',
    appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
    measurementId: 'G-5LHTKTWX0M',
  };
  
  // Global Firebase services object
  window.NeuraFitFirebase = {
    initialized: false,
    services: null,
    initPromise: null,
    
    // Initialize Firebase
    init: async function() {
      if (this.initPromise) return this.initPromise;
      
      this.initPromise = new Promise(async (resolve, reject) => {
        try {
          console.log('🔥 Loading Firebase modules...');
          
          // Load Firebase SDK from CDN to avoid bundling issues
          const scripts = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js'
          ];
          
          // Load scripts sequentially
          for (const src of scripts) {
            await this.loadScript(src);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between loads
          }
          
          console.log('✅ Firebase scripts loaded');
          
          // Initialize Firebase
          const app = firebase.initializeApp(firebaseConfig);
          const auth = firebase.auth();
          const firestore = firebase.firestore();
          const functions = firebase.functions();
          
          // Initialize analytics if supported
          let analytics = null;
          try {
            if (firebase.analytics && firebase.analytics.isSupported) {
              const supported = await firebase.analytics.isSupported();
              if (supported) {
                analytics = firebase.analytics();
                console.log('✅ Firebase Analytics initialized');
              }
            }
          } catch (error) {
            console.warn('⚠️ Analytics initialization failed:', error);
          }
          
          this.services = { app, auth, firestore, functions, analytics };
          this.initialized = true;
          
          console.log('🎉 Firebase initialization complete!');
          resolve(this.services);
          
        } catch (error) {
          console.error('❌ Firebase initialization failed:', error);
          reject(error);
        }
      });
      
      return this.initPromise;
    },
    
    // Helper to load scripts
    loadScript: function(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },
    
    // Get services (async)
    getServices: async function() {
      if (!this.initialized) {
        await this.init();
      }
      return this.services;
    }
  };
  
  console.log('✅ Firebase loader ready');
})();
