import React, { useState, useEffect, useCallback, useRef } from 'react';

const HemisphericalKeyboard = () => {
  const [text, setText] = useState('');
  const [verticalRotation, setVerticalRotation] = useState(0);
  const [horizontalRotation, setHorizontalRotation] = useState(0);
  const [selectedSector, setSelectedSector] = useState<string[] | null>(null);
  const [highlightedChar, setHighlightedChar] = useState<string | null>(null);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  // Ref to track if the selection button is pressed
  const selectingRef = useRef(false);

  // Debounce and throttle timings
  const DEBOUNCE_TIME = 200; // in ms
  const THROTTLE_TIME = 100; // in ms

  const sectors = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y'],
    ['Z', '0', '1', '2', '3'],
    ['4', '5', '6', '7', '8'],
    ['9', '.', ',', '!', '?']
  ];

  const handleRotation = useCallback((vertical: number, horizontal: number) => {
    setVerticalRotation((prev) => Math.max(-45, Math.min(45, prev + vertical)));
    setHorizontalRotation((prev) => (prev + horizontal + 360) % 360);
    
    const sectorIndex = Math.floor((horizontalRotation / 360) * sectors.length);
    setSelectedSector(sectors[sectorIndex]);
    // Reset the character index when the row changes
    setCurrentCharIndex(0);
  }, [horizontalRotation]);

  const handleCharacterSelection = useCallback(() => {
    if (highlightedChar) {
      setText((prev) => prev + highlightedChar);
      setSelectedSector(null);
      setHighlightedChar(null);
      setCurrentCharIndex(0); // Reset character index on selection
    }
  }, [highlightedChar]);

  const throttle = (func: (...args: any[]) => void, limit: number) => {
    let lastFunc: NodeJS.Timeout | null = null;
    let lastRan: number | null = null;
    return function (this: any, ...args: any[]) {
      const context = this;
      if (lastRan === null) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        if (lastFunc) clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
          if ((Date.now() - lastRan!) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan!));
      }
    };
  };

  const handleDPadNavigation = useCallback((direction: string) => {
    if (selectedSector) {
      switch (direction) {
        case 'left':
          setCurrentCharIndex((prev) => (prev - 1 + selectedSector.length) % selectedSector.length);
          break;
        case 'right':
          setCurrentCharIndex((prev) => (prev + 1) % selectedSector.length);
          break;
        default:
          break;
      }
      // Update highlighted character
      setHighlightedChar(selectedSector[currentCharIndex]);
    }
  }, [selectedSector, currentCharIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        setCurrentRowIndex((prev) => (prev - 1 + sectors.length) % sectors.length);
        break;
      case 'ArrowDown':
        setCurrentRowIndex((prev) => (prev + 1) % sectors.length);
        break;
      case 'ArrowLeft':
        handleDPadNavigation('left');
        break;
      case 'ArrowRight':
        handleDPadNavigation('right');
        break;
      case 'Enter':
        if (!selectingRef.current) {
          selectingRef.current = true;
          handleCharacterSelection();
          setTimeout(() => selectingRef.current = false, DEBOUNCE_TIME); // Reset after debounce time
        }
        break;
      default:
        break;
    }
  }, [handleDPadNavigation, handleCharacterSelection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const gamepadHandler = throttle(() => {
      const gamepads = navigator.getGamepads();
      if (gamepads[0]) {
        const gamepad = gamepads[0];
        setControllerConnected(true);

        // Left stick
        const leftStickX = gamepad.axes[0];
        const leftStickY = gamepad.axes[1];
        
        // Apply deadzone
        const deadzone = 0.1;
        if (Math.abs(leftStickY) > deadzone || Math.abs(leftStickX) > deadzone) {
          handleRotation(leftStickY * 2, leftStickX * 5);
        }

        // A button (Xbox) or X button (PlayStation)
        if (gamepad.buttons[0].pressed) {
          if (!selectingRef.current) {
            selectingRef.current = true;
            handleCharacterSelection();
            setTimeout(() => selectingRef.current = false, DEBOUNCE_TIME); // Reset after debounce time
          }
        }

        // B button (Xbox) or Circle button (PlayStation)
        if (gamepad.buttons[1].pressed) {
          setText(text => text.slice(0, -1)); // Backspace
        }

        // Y button (Xbox) or Triangle button (PlayStation)
        if (gamepad.buttons[3].pressed) {
          setText(''); // Clear
        }

        // Right stick for fine-tuning
        const rightStickX = gamepad.axes[2];
        const rightStickY = gamepad.axes[3];
        if (Math.abs(rightStickY) > deadzone || Math.abs(rightStickX) > deadzone) {
          handleRotation(rightStickY, rightStickX * 2);
        }

        // D-pad support
        if (gamepad.buttons[12].pressed) handleDPadNavigation('left');
        if (gamepad.buttons[13].pressed) handleDPadNavigation('right');
      } else {
        setControllerConnected(false);
      }
    }, THROTTLE_TIME);
    
    const gamepadInterval = setInterval(gamepadHandler, 16);
    
    window.addEventListener('gamepadconnected', () => setControllerConnected(true));
    window.addEventListener('gamepaddisconnected', () => setControllerConnected(false));

    return () => {
      clearInterval(gamepadInterval);
      window.removeEventListener('gamepadconnected', () => setControllerConnected(true));
      window.removeEventListener('gamepaddisconnected', () => setControllerConnected(false));
    };
  }, [handleRotation, handleCharacterSelection, setText, handleDPadNavigation]);

  useEffect(() => {
    setSelectedSector(sectors[currentRowIndex]);
    setCurrentCharIndex(0); // Reset character index on row change
  }, [currentRowIndex]);

  useEffect(() => {
    if (selectedSector && selectedSector.length > 0) {
      setHighlightedChar(selectedSector[currentCharIndex]);
    }
  }, [currentCharIndex, selectedSector]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-500 p-4 overflow-hidden">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Hemispherical Keyboard VR Text Entry Simulation</h2>
        <input
          type="text"
          value={text}
          readOnly
          className="w-full p-2 text-lg border rounded mb-4"
        />
        <div className="mb-4 text-center">
          <p>Vertical Rotation: {verticalRotation.toFixed(2)}°</p>
          <p>Horizontal Rotation: {horizontalRotation.toFixed(2)}°</p>
          <p>Controller: {controllerConnected ? 'Connected' : 'Not Connected'}</p>
        </div>
        <div className="relative w-64 h-64 mx-auto mb-4 border-4 border-gray-300 rounded-full overflow-hidden">
          <div 
            className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
            style={{
              transform: `rotateX(${verticalRotation}deg) rotateY(${horizontalRotation}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {selectedSector ? selectedSector.join(' ') : 'Hemisphere'}
          </div>
        </div>
        {selectedSector && (
          <div className="text-center mb-4">
            <p className="text-xl font-bold">Zoomed View</p>
            <div className="flex justify-center space-x-2">
              {selectedSector.map((char, index) => (
                <span
                  key={index}
                  className={`p-2 border ${highlightedChar === char ? 'border-blue-500' : 'border-gray-300'} rounded`}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HemisphericalKeyboard;
