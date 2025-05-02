import React from 'react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children, imageSrc, title }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          src={imageSrc || 'https://source.unsplash.com/random?modern,technology'}
          alt="Auth background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-4xl font-bold mb-4">{title}</h2>
            <p className="text-lg text-gray-200">Welcome to our AI-powered blog platform</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 