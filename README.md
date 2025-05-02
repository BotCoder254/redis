# AI-Powered Modern Blog

A modern blog platform built with React.js, Firebase, and Tailwind CSS, featuring a beautiful UI with Framer Motion animations.

## Features

- 🔐 User Authentication (Email/Password & Google Sign-in)
- 🎨 Modern UI with Framer Motion animations
- 🔍 Search functionality
- 📱 Responsive design
- 🎯 Trending posts section
- 👥 Featured authors
- 🏷️ Category filtering

## Tech Stack

- React.js
- Firebase (Authentication & Firestore)
- Tailwind CSS
- Framer Motion
- React Icons
- React Router DOM

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-blog.git
cd ai-blog
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password & Google)
   - Create a Firestore database
   - Get your Firebase configuration

4. Create a `.env` file in the root directory and add your Firebase configuration:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

5. Update the Firebase configuration in `src/config/firebase.js` with your environment variables.

6. Start the development server:
```bash
npm start
```

## Project Structure

```
src/
├── components/
│   └── auth/
│       └── AuthLayout.js
├── config/
│   └── firebase.js
├── context/
│   └── AuthContext.js
├── pages/
│   ├── auth/
│   │   ├── Login.js
│   │   ├── Signup.js
│   │   └── ForgotPassword.js
│   └── Dashboard.js
└── App.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React.js](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [React Icons](https://react-icons.github.io/react-icons/)
