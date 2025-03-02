# Pacman Web

A web-based Pacman game served by a Go web server.

## Features

- Classic Pacman maze gameplay
- Score tracking
- Keyboard controls (arrow keys)
- Responsive canvas-based rendering

## How to Run

1. Make sure you have Go installed (version 1.22.2 or later)
2. Clone this repository
3. Navigate to the project directory
4. Run the application:

```
go run main.go
```

5. Open your browser and go to `http://localhost:8080`

## Controls

- Use the arrow keys to navigate Pacman through the maze
- Press the Start button to begin the game
- Collect dots to earn points (10 points each)
- Collect power pellets for bonus points (50 points each)

## Project Structure

- `main.go` - Go web server that serves the game
- `static/` - Directory containing web assets
  - `index.html` - Main HTML file
  - `style.css` - Game styling
  - `game.js` - Game logic and rendering

## Future Improvements

- Add ghost enemies with AI
- Implement power mode (after eating power pellets)
- Add multiple levels
- Add high score tracking
- Add mobile touch controls

## License

This project is open source and available under the MIT License.# pacman
