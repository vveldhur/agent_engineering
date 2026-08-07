# Google Cloud Innovations Summit 2026

A premium, highly interactive 1-day technical conference informational website built with Python (Flask) on the backend and modern vanilla HTML, CSS, and JavaScript on the front-end. The site is fully themed around Google Cloud Technologies.

---

## 🚀 Key Features

1. **Dynamic Headers & Live Status**:
   - Automatically displays the current date in a human-friendly format.
   - **Live Session Tracker**: The hero section parses the user's current system time, dynamically identifies which talk is active, and displays its status (e.g. `Live Now: Talk #3`). The active card receives a glowing blue border.
2. **Timetable / Schedule**:
   - Organizes exactly 8 technical talks spanning 45 minutes each.
   - Features a dedicated, visual 60-minute **Lunch & Networking Break** card at 12:00 PM.
3. **Dynamic Filtering & Search**:
   - **Real-time Search Bar**: Instantly filter talks by title, description, or presenter name.
   - **Category Filters**: Chip selectors filter talks by category:
     * *Cloud Infrastructure & App Dev* (Category 1)
     * *Data Analytics & AI/ML* (Category 2)
4. **Premium UI/UX Design**:
   - Default Glassmorphism Dark Mode with background glow blobs using Google Cloud colors (Blue, Red, Yellow, Green).
   - Custom scrolling animations, hover micro-effects, and transitions.
   - Full Light/Dark Theme toggle using CSS custom properties (variables) persisted in `localStorage`.
   - 100% mobile-responsive layout.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask 3.0+
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6)
- **Unit Tests**: Python `unittest` framework

---

## 📂 Project Structure

```
├── app.py                  # Flask server containing talk data & routing
├── requirements.txt        # Python package dependencies
├── test_app.py             # Unit tests checking server & data constraints
├── templates/
│   └── index.html          # Main HTML structure with semantic blocks
└── static/
    ├── css/
    │   └── styles.css      # Premium glassmorphic design and dark/light themes
    └── js/
        └── app.js          # Client-side search, filtering, and live state tracker
```

---

## 💻 Local Setup & Execution

### 1. Prerequisites
Ensure you have **Python 3** installed on your machine.

### 2. Setup Virtual Environment
Run the following commands in the project root directory:

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows (cmd):
venv\Scripts\activate.bat
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Unit Tests
To verify all schedule constraints (exactly 8 talks, 1-2 speakers per talk, exactly 60-minute lunch break, proper data fields) are met:
```bash
python3 -m unittest test_app.py
```

### 5. Launch the Web Application
```bash
# Set the port and run
export PORT=8080   # On Windows: set PORT=8080
python3 app.py
```
Open your browser and navigate to **`http://127.0.0.1:8080/`**.

---

## ✏️ How to Customize or Make Changes

### 1. Adding/Modifying Talks & Speakers
Open [app.py](file:///Users/venugopalve/Documents/agy2-pprojects/conference-website/app.py). Find the `TALKS_DATA` array. You can modify:
* `title` (Talk title)
* `category_id` (1 for Infrastructure/App Dev, 2 for Data/AI)
* `start_time` and `end_time` (Format: `HH:MM AM/PM`)
* `speakers` (List of objects; supports up to 2 speakers per talk; include first name, last name, and LinkedIn URL).

### 2. Changing the Theme & Color Scheme
Open [static/css/styles.css](file:///Users/venugopalve/Documents/agy2-pprojects/conference-website/static/css/styles.css).
- At the top of the file, you'll find the `:root` variables block (for Dark theme) and `body.light-theme` variables block.
- Adjust colors, border radii, shadows, and backdrop blurs directly.
- Modify background blobs via `.glow-blue`, `.glow-red`, and `.glow-green`.

### 3. Modifying Interactivity or Schedule Bounds
Open [static/js/app.js](file:///Users/venugopalve/Documents/agy2-pprojects/conference-website/static/js/app.js).
- If you update the timings in `app.py`, update the `eventSchedule` bounds array inside `app.js` (defined in minutes from midnight, e.g. 9:00 AM is `540` minutes) so the live tracking highlighter aligns perfectly.
