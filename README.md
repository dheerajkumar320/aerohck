# Rubik's Cube Solver

This is a web-based application that solves a 3x3x3 Rubik's Cube using Kociemba's two-phase algorithm. The application provides a user-friendly interface to visualize the cube, scramble it, and then find an optimal solution.

## Features

- **Interactive 3D Cube:** A fully interactive 3D Rubik's Cube rendered in the browser.
- **Scramble:** Randomly scramble the cube to any state.
- **Solve:** Find an optimal solution to the scrambled cube using Kociemba's algorithm.
- **Performance Analysis:** Includes tools to analyze the performance of the solving algorithm.

## Live Demo

[You can add a link to your live demo here if you have one.]

## Installation

To run this project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dheerajkumar320/aerohck.git
   cd aerohck
   ```

2. **Create a virtual environment and activate it:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

To start the web application, run the following command:

```bash
python app.py
```

Then, open your web browser and navigate to `http://127.0.0.1:5000`.

## Technology Stack

- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript, Three.js (for the 3D cube)
- **Algorithm:** Kociemba's two-phase algorithm implemented in Python.

## File Structure

```
.
├── app.py
├── performance_analyzer.py
├── performance_chart.png
├── Procfile
├── pykociemba
│   ├── color.py
│   ├── coordcube.py
│   ├── corner.py
│   ├── cubiecube.py
│   ├── edge.py
│   ├── facecube.py
│   ├── facelet.py
│   ├── __init__.py
│   ├── prunetables
│   ├── scramble_to_state.py
│   ├── search.py
├── README.md
├── requirements.txt
├── runtime.txt
├── static
│   ├── cube.js
│   └── cube_notation.png
├── templates
│   └── index.html
└── venv
```

## License

This project is licensed under the MIT License.
