import { useState, useEffect } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const googleProvider = new GoogleAuthProvider();

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 인증 상태 변경 감지 (자동 로그인)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    loginWithGoogle,
    logout,
  };
};

