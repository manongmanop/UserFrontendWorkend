import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider, 
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
} from "firebase/auth"

import { auth } from '../../firebase'

const userAuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

export function UserAuthContextProvider({ children }) {

    const [user, setUser] = useState({});

    function logIn(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signUp(email, password) {
    return createUserWithEmailAndPassword(auth, email, password).then((userCredential) => {
        sendEmailVerification(userCredential.user);
        });
    }

    function logOut() {
        return signOut(auth);
    }

    function googleSignIn() {
        return signInWithPopup(auth, googleProvider);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentuser) => {
            console.log("Auth", currentuser); // ตรวจดูว่า email อยู่ใน currentuser ไหม
            setUser(currentuser);
        });
        return () => unsubscribe();
    }, []);    

  return (
    <userAuthContext.Provider value={{ user, logIn, signUp, logOut, googleSignIn , resetPassword  }}>
        {children}
    </userAuthContext.Provider>
  )
}

export function useUserAuth() {
    return useContext(userAuthContext);
}