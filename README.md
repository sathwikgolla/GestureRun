# 🎮 GestureRun
## 🖐️ A Hand Gesture Controlled Endless Runner Game

> 🚀 *Run. Jump. Slide. Dodge — all using your hands.*

**GestureRun** is a **Temple Run–style endless runner game** controlled entirely by **real-time hand gestures using a webcam**.  

No keyboard ❌  
No mouse ❌  
Just hand movements 🖐️  

This project combines **Computer Vision + Game Development** to create a futuristic, touch-free gaming experience directly in the browser.

---

## ✨ Key Highlights

- ✅ 100% gesture-controlled gameplay  
- ✅ Real-time webcam hand tracking  
- ✅ Smooth left / right / jump / slide controls  
- ✅ Endless runner mechanics  
- ✅ Runs fully in the browser  
- ✅ No backend required  

---

## 🎯 Gesture Controls

| 🖐️ Hand Movement | 🎮 Game Action |
|------------------|--------------|
| ⬅️ Move hand LEFT | Move player left |
| ➡️ Move hand RIGHT | Move player right |
| ⬆️ Move hand UP | Jump |
| ⬇️ Move hand DOWN | Slide |

> Gestures are detected by tracking the **palm center** and comparing movement across frames.

---

## 🧠 How It Works

- 🔹 Webcam captures live video  
- 🔹 MediaPipe Hands detects hand landmarks  
- 🔹 Palm movement direction is calculated  
- 🔹 Gestures are mapped to game actions  
- 🔹 Game updates in real-time using **Canvas API**

---

## 🛠️ Tech Stack

### 🧩 Frontend
- HTML5  
- CSS3  
- JavaScript (Vanilla)  

### 👁️ Computer Vision
- MediaPipe Hands  
- WebRTC (camera access)  

### 🎮 Game Engine
- HTML Canvas API  

---

## 📁 Project Structure

gesture-runner/
│
├── index.html # Main entry file
├── style.css # UI & layout styling
├── game.js # Game logic & physics
├── handTracking.js # Gesture detection logic
└── assets/ # Images / sounds

---

## ▶️ How to Run the Game

⚠️ **Webcam access requires a local server** (file:// won’t work)

### ✅ Option 1: VS Code (Recommended)
1. Open the project folder in VS Code  
2. Install **Live Server** extension  
3. Right-click `index.html` → **Open with Live Server**

### ✅ Option 2: Python Server
```bash
python -m http.server
[Visit Gesture Run Website](https://gesture-run.vercel.app)

