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
          
          // Load Firebase v9+ modular SDK from CDN
          const scripts = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js'
          ];

          // Load scripts sequentially
          for (const src of scripts) {
            await this.loadScript(src);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between loads
          }

          console.log('✅ Firebase compat scripts loaded');

          // Initialize Firebase using compat API
          const app = firebase.initializeApp(firebaseConfig);
          const auth = firebase.auth();
          const firestore = firebase.firestore();
          const functions = firebase.functions();

          console.log('✅ Firebase services initialized:', {
            app: !!app,
            auth: !!auth,
            firestore: !!firestore,
            functions: !!functions
          });

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

          // Expose Firebase functions globally for analytics
          window.firebaseAnalytics = {
            logEvent: firebase.analytics ? firebase.analytics.logEvent : () => {},
            setUserProperties: firebase.analytics ? firebase.analytics.setUserProperties : () => {},
            setUserId: firebase.analytics ? firebase.analytics.setUserId : () => {}
          };

          console.log('🎉 Firebase external loader initialization complete!');
          
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
