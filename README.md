🎮 GestureRun
🖐️ A Hand Gesture Controlled Endless Runner Game

GestureRun is a Temple Run–style endless runner game controlled entirely using real-time hand gestures through a webcam.
No keyboard. No mouse. Just your hands in the air.

Built using Computer Vision + JavaScript, this project demonstrates how camera-based gesture tracking can be used for interactive gaming experiences.

🚀 Features

📷 Webcam-based control (no physical input devices)

🖐️ Real-time hand gesture recognition

🏃 Endless runner gameplay (Temple Run / Subway Surfers inspired)

🛣️ 3-lane movement system

⬆️ Jump, ⬇️ Slide, ⬅️ Left, ➡️ Right using hand motion

🧠 Gesture smoothing to avoid accidental movements

🎯 Score tracking

💻 Runs completely in the browser

🎮 Gesture Controls
Hand Movement	Game Action
Move hand LEFT	Move player left
Move hand RIGHT	Move player right
Move hand UP	Jump
Move hand DOWN	Slide

The game tracks the palm center using MediaPipe Hands and compares movement between frames to detect gestures.

🛠️ Tech Stack

HTML5

CSS3

JavaScript (Vanilla)

Canvas API (game rendering)

MediaPipe Hands (hand tracking & gesture detection)

WebRTC (camera access)

📁 Project Structure
gesture-runner/
│
├── index.html        # Main HTML file
├── style.css         # Game styling
├── game.js           # Game logic (player, obstacles, score)
├── handTracking.js   # Hand detection & gesture logic
└── assets/           # Images / sounds

⚙️ How It Works

The browser requests access to the user’s webcam.

MediaPipe Hands detects the hand and tracks palm movement.

Hand movement direction is calculated by comparing current and previous positions.

Detected gestures are mapped to in-game actions.

The game runs continuously until a collision occurs.

▶️ How to Run Locally

⚠️ Camera access requires a local server (not file://)

Option 1: VS Code (Recommended)

Open project folder in VS Code

Install Live Server extension

Right-click index.html → Open with Live Server

Option 2: Using Python
python -m http.server


Open:

http://localhost:8000

📸 Screenshots / Demo

(Add screenshots or a screen-recorded GIF here for better impact)

🎓 Learning Outcomes

Practical understanding of computer vision in browsers

Real-time gesture processing

Game physics (gravity, collision detection)

Canvas-based game development

Mapping real-world motion to digital controls

🧠 Future Enhancements

🎮 3D version using Three.js

📱 Mobile camera support

🔊 Sound effects & background music

✋ More gestures (pause, speed boost)

🏆 High score leaderboard

📜 Legal Note

This project is inspired by Temple Run / Subway Surfers but is an original implementation.
No proprietary assets or APIs from commercial games are used.
