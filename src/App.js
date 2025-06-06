import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// Your actual Firebase project configuration provided by you.
// IMPORTANT: Make sure these values are correct for your Firebase project.
const firebaseConfig = {
    apiKey: "AIzaSyBGtpeo_wx4gAOB0N9XUw47sOzTz88OZoM",
    authDomain: "printer-tracker-app.firebaseapp.com",
    projectId: "printer-tracker-app", // This is also your appId
    storageBucket: "printer-tracker-app.firebasestorage.app",
    messagingSenderId: "822579148942",
    appId: "1:822579148942:web:8f7fd2f58353a9241671df",
    measurementId: "G-6BXWEKHSMQ"
};
const appId = firebaseConfig.projectId; // Use your Firebase project ID as the appId for data paths
const initialAuthToken = null; // Not needed for typical deployments outside Canvas

// Helper function to format timestamp into a readable date string (without time)
const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    // Ensure date is valid before formatting
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString(); // Formats to local date string only
};

// Component for the Reports Page
const ReportsPage = ({ history, isAuthReady, reportPeriod, setReportPeriod, reportStartDate, setReportStartDate, consumptionSummary, setConsumptionSummary, generateConsumptionReport }) => {

    // Automatically generate report when dependencies change
    useEffect(() => {
        if (isAuthReady && history.length > 0) {
            generateConsumptionReport();
        }
    }, [isAuthReady, history, reportPeriod, reportStartDate, generateConsumptionReport]);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-6">
                Reports & Activity Log
            </h1>

            {/* Consumption Report Section */}
            <div className="mb-8 p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-inner">
                <h2 className="text-2xl font-bold text-orange-700 mb-4 text-center">
                    Consumption Report
                </h2>
                <div className="flex flex-col space-y-3 mb-4">
                    <div className="flex items-center">
                        <label htmlFor="reportPeriod" className="text-lg font-semibold text-orange-800 mr-3">
                            Period:
                        </label>
                        <select
                            id="reportPeriod"
                            value={reportPeriod}
                            onChange={(e) => setReportPeriod(e.target.value)}
                            className="flex-1 p-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="reportStartDate" className="text-lg font-semibold text-orange-800 mr-3">
                            Start Date:
                            </label>
                        <input
                            id="reportStartDate"
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="flex-1 p-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {consumptionSummary && (
                    <div className="bg-orange-200 p-4 rounded-lg">
                        <h3 className="text-xl font-bold text-orange-800 mb-3">Summary:</h3>
                        <div className="mb-3">
                            <h4 className="font-semibold text-orange-700 mb-1">Ink Consumed:</h4>
                            {Object.entries(consumptionSummary.ink).every(([, quantity]) => quantity === 0) ? (
                                <p className="text-orange-600 ml-2">No ink consumed.</p>
                            ) : (
                                <ul className="list-disc list-inside text-orange-700">
                                    {Object.entries(consumptionSummary.ink).map(([color, quantity]) =>
                                        quantity > 0 && (
                                            <li key={color}>
                                                {color.charAt(0).toUpperCase() + color.slice(1)}: {quantity}
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold text-orange-700 mb-1">Paper Consumed:</h4>
                            {Object.entries(consumptionSummary.paper).every(([, quantity]) => quantity === 0) ? (
                                <p className="text-orange-600 ml-2">No paper consumed.</p>
                            ) : (
                                <ul className="list-disc list-inside text-orange-700">
                                    {Object.entries(consumptionSummary.paper).map(([dimensions, quantity]) =>
                                        quantity > 0 && (
                                            <li key={dimensions}>
                                                {dimensions} rolls: {quantity}
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </div>
                        {consumptionSummary.error && (
                            <p className="text-red-600 mt-3">{consumptionSummary.error}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Activity Log Section */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-inner">
                <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center">
                    Activity Log
                </h2>
                {history.length === 0 ? (
                    <p className="text-center text-gray-600">No activity yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {/* Sort history by timestamp in descending order (newest first) */}
                        {[...history].sort((a, b) => b.timestamp - a.timestamp).map((entry, index) => (
                            <li key={index} className="bg-purple-100 p-3 rounded-lg shadow-sm text-sm">
                                <span className="font-semibold text-purple-800">
                                    {formatDate(entry.timestamp)}:
                                </span>{' '}
                                {entry.type === 'ink' ? (
                                    `${entry.action.charAt(0).toUpperCase() + entry.action.slice(1)} ${entry.quantity} of ${entry.color.charAt(0).toUpperCase() + entry.color.slice(1)} Ink`
                                ) : (
                                    `${entry.action.charAt(0).toUpperCase() + entry.action.slice(1)} ${entry.quantity} paper roll(s) of ${entry.width}x${entry.length}`
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// Main App component
const App = () => {
    // State variables for Firebase instances and user ID
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // State for current page view ('supplies' or 'reports')
    const [currentPage, setCurrentPage] = useState('supplies');

    // State variables for ink levels
    const [inkLevels, setInkLevels] = useState({
        cyan: 0,
        magenta: 0,
        yellow: 0,
        black: 0,
    });

    // Paper is tracked as an array of individual rolls with width and length
    const [paperRolls, setPaperRolls] = useState([]);
    // State for temporary input values for adding a new paper roll
    const [newRollWidth, setNewRollWidth] = useState('');
    const [newRollLength, setNewRollLength] = useState('');
    const [newRollQuantity, setNewRollQuantity] = useState('1'); // New state for quantity, default to 1

    // State for transaction history
    const [history, setHistory] = useState([]);

    // State for managing UI messages (e.g., success/error)
    const [message, setMessage] = useState('');

    // State for manually setting the date for new entries
    const [manualDate, setManualDate] = useState('');

    // States for Consumption Report
    const [reportPeriod, setReportPeriod] = useState('month'); // 'week', 'month', 'year'
    const [reportStartDate, setReportStartDate] = useState(''); // Date string for the start of the report period
    const [consumptionSummary, setConsumptionSummary] = useState(null);

    // Initialize Firebase and set up authentication listener
    useEffect(() => {
        try {
            // Initialize Firebase app
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);

            setDb(firestore);
            setAuth(authentication);

            // Set default date for manual entries to today
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const day = String(today.getDate()).padStart(2, '0');
            setManualDate(`${year}-${month}-${day}`);
            setReportStartDate(`${year}-${month}-${day}`); // Set default report start date to today

            // Listen for authentication state changes
            const unsubscribeAuth = onAuthStateChanged(authentication, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Sign in anonymously if no user is found and no custom token is provided
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(authentication, initialAuthToken);
                        } else {
                            await signInAnonymously(authentication);
                        }
                    } catch (error) {
                        console.error('Error signing in:', error);
                        setMessage(`Error signing in: ${error.message}`);
                    }
                }
                setIsAuthReady(true); // Mark authentication as ready
            });

            // Cleanup function for auth listener
            return () => unsubscribeAuth();
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            setMessage(`Error initializing app: ${error.message}`);
        }
    }, []); // Empty dependency array means this runs once on component mount

    // Fetch and listen for real-time updates to supply data and history
    useEffect(() => {
        if (db && userId && isAuthReady) {
            // Construct the document path for printer supplies
            // Private data path: /artifacts/${appId}/users/${userId}/printerSupplies/currentSupplies
            const supplyDocRef = doc(db, `artifacts/${appId}/users/${userId}/printerSupplies/currentSupplies`);

            // Set up a real-time listener for the document
            const unsubscribeSnapshot = onSnapshot(supplyDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    // Update state with the fetched data
                    const data = docSnap.data();
                    setInkLevels(data.inkLevels || { cyan: 0, magenta: 0, yellow: 0, black: 0 });
                    setPaperRolls(data.paperRolls || []); // paperRolls is now an array
                    setHistory(data.history || []); // Also fetch history
                } else {
                    // If document doesn't exist, initialize with default values
                    console.log('No supply data found, initializing...');
                    const initialData = {
                        inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
                        paperRolls: [], // Initialize as an empty array
                        history: [] // Initialize history as an empty array
                    };
                    setDoc(supplyDocRef, initialData)
                        .catch(error => console.error('Error initializing document:', error));
                }
            }, (error) => {
                console.error('Error fetching real-time data:', error);
                setMessage(`Error fetching data: ${error.message}`);
            });

            // Cleanup function for snapshot listener
            return () => unsubscribeSnapshot();
        }
    }, [db, userId, isAuthReady]); // Re-run when db, userId, or isAuthReady changes

    // Function to update ink supply levels in Firestore
    const updateInkSupply = async (color, amount) => {
        if (!db || !userId) {
            setMessage('App not ready. Please wait or refresh.');
            return;
        }
        if (!manualDate) {
            setMessage('Please select a date for the entry.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const supplyDocRef = doc(db, `artifacts/${appId}/users/${userId}/printerSupplies/currentSupplies`);
        let newInkLevels = { ...inkLevels }; // Create a copy to modify
        const currentLevel = inkLevels[color];
        newInkLevels[color] = Math.max(0, currentLevel + amount); // Ensure level doesn't go below 0

        let updatedHistory = [...history];
        const actionType = amount > 0 ? 'added' : 'used';

        // Only log "used" action if ink level was actually reduced
        if (actionType === 'used' && currentLevel === 0) {
            setMessage(`${color.charAt(0).toUpperCase() + color.slice(1)} Ink is already at 0. Cannot use.`);
            setTimeout(() => setMessage(''), 3000);
            // No history entry for using 0 ink
        } else {
            // Create a new history entry
            const newHistoryEntry = {
                type: 'ink',
                color: color,
                action: actionType,
                quantity: Math.abs(amount),
                timestamp: new Date(manualDate).getTime(), // Use selected date as timestamp
            };
            updatedHistory.push(newHistoryEntry);
            try {
                // Update Firestore document with new ink levels and updated history
                await setDoc(supplyDocRef, { inkLevels: newInkLevels, paperRolls: paperRolls, history: updatedHistory });
                setMessage(`${color.charAt(0).toUpperCase() + color.slice(1)} Ink ${actionType} successfully!`);
                setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
            } catch (error) {
                console.error(`Error updating ${color} ink level:`, error);
                setMessage(`Failed to update ${color} ink: ${error.message}`);
            }
        }
    };

    // Function to add new paper rolls to the inventory
    const addPaperRoll = async () => {
        if (!db || !userId) {
            setMessage('App not ready. Please wait or refresh.');
            return;
        }
        if (!manualDate) {
            setMessage('Please select a date for the entry.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const width = parseInt(newRollWidth);
        const length = parseInt(newRollLength);
        const quantity = parseInt(newRollQuantity);

        // Validate inputs
        if (isNaN(width) || width <= 0 || isNaN(length) || length <= 0 || isNaN(quantity) || quantity <= 0) {
            setMessage('Please enter valid positive numbers for width, length, and quantity.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        let updatedPaperRolls = [...paperRolls];
        for (let i = 0; i < quantity; i++) {
            updatedPaperRolls.push({ width, length }); // Add multiple rolls based on quantity
        }

        // Create a new history entry with the manually selected date
        const newHistoryEntry = {
            type: 'paper',
            width: width,
            length: length,
            action: 'added',
            quantity: quantity,
            timestamp: new Date(manualDate).getTime(), // Use selected date as timestamp
        };
        const updatedHistory = [...history, newHistoryEntry];

        const supplyDocRef = doc(db, `artifacts/${appId}/users/${userId}/printerSupplies/currentSupplies`);
        try {
            // Update Firestore with the new array of paper rolls and updated history
            await setDoc(supplyDocRef, { inkLevels: inkLevels, paperRolls: updatedPaperRolls, history: updatedHistory });
            setMessage(`${quantity} new paper roll(s) added successfully!`);
            setNewRollWidth(''); // Clear input fields after adding
            setNewRollLength('');
            setNewRollQuantity('1'); // Reset quantity to 1
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error adding paper roll:', error);
            setMessage(`Failed to add paper roll: ${error.message}`);
        }
    };

    // Function to remove one paper roll of a specific width and length
    const removePaperRoll = async (widthToRemove, lengthToRemove) => {
        if (!db || !userId) {
            setMessage('App not ready. Please wait or refresh.');
            return;
        }
        if (!manualDate) {
            setMessage('Please select a date for the entry.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const updatedPaperRolls = [...paperRolls];
        // Find the index of the first roll that matches the dimensions
        const indexToRemove = updatedPaperRolls.findIndex(
            (roll) => roll.width === widthToRemove && roll.length === lengthToRemove
        );

        if (indexToRemove > -1) {
            updatedPaperRolls.splice(indexToRemove, 1); // Remove only one roll

            // Create a new history entry with the manually selected date
            const newHistoryEntry = {
                type: 'paper',
                width: widthToRemove,
                length: lengthToRemove,
                action: 'used',
                quantity: 1, // Always removing one at a time
                timestamp: new Date(manualDate).getTime(), // Use selected date as timestamp
            };
            const updatedHistory = [...history, newHistoryEntry];

            const supplyDocRef = doc(db, `artifacts/${appId}/users/${userId}/printerSupplies/currentSupplies`);
            try {
                // Update Firestore with the new array of paper rolls and updated history
                await setDoc(supplyDocRef, { inkLevels: inkLevels, paperRolls: updatedPaperRolls, history: updatedHistory });
                setMessage(`One paper roll (${widthToRemove}x${lengthToRemove}) removed successfully!`);
                setTimeout(() => setMessage(''), 3000);
            } catch (error) {
                console.error('Error removing paper roll:', error);
                setMessage(`Failed to remove paper roll: ${error.message}`);
            }
        } else {
            setMessage('No matching paper roll found to remove.');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Use useMemo to group paper rolls for display whenever paperRolls changes
    const groupedPaperRolls = useMemo(() => {
        const groups = {};
        paperRolls.forEach(roll => {
            const key = `${roll.width}x${roll.length}`;
            if (groups[key]) {
                groups[key].quantity++;
            } else {
                groups[key] = { width: roll.width, length: roll.length, quantity: 1 };
            }
        });
        // Convert the groups object back into an array for mapping in JSX
        return Object.values(groups);
    }, [paperRolls]); // Recalculate only when paperRolls array changes

    // Helper function to get Tailwind color classes based on ink color
    const getInkColorClasses = (color) => {
        switch (color) {
            case 'cyan':
                return 'bg-cyan-500 hover:bg-cyan-600';
            case 'magenta':
                return 'bg-fuchsia-500 hover:bg-fuchsia-600'; // Fuchsia is a close match for Magenta in Tailwind
            case 'yellow':
                return 'bg-yellow-500 hover:bg-yellow-600';
            case 'black':
                return 'bg-gray-800 hover:bg-gray-900';
            default:
                return 'bg-blue-600 hover:bg-blue-700'; // Default blue
        }
    };

    // Function to generate the consumption report
    const generateConsumptionReport = useCallback(() => {
        if (!reportStartDate) {
            setConsumptionSummary({ error: 'Please select a start date for the report.' });
            return;
        }

        const startDate = new Date(reportStartDate);
        startDate.setHours(0, 0, 0, 0); // Normalize to start of day

        let endDate = new Date(startDate);

        switch (reportPeriod) {
            case 'week':
                endDate.setDate(startDate.getDate() + 7); // 7 days from start
                break;
            case 'month':
                endDate.setMonth(startDate.getMonth() + 1); // Next month, same date
                break;
            case 'year':
                endDate.setFullYear(startDate.getFullYear() + 1); // Next year, same date
                break;
            default:
                // Default to month if something unexpected happens
                endDate.setMonth(startDate.getMonth() + 1);
                break;
        }
        endDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

        const inkConsumption = { cyan: 0, magenta: 0, yellow: 0, black: 0 };
        const paperConsumption = {}; // Store {width:length: quantity}

        history.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            // Check if the entry falls within the selected period
            if (entryDate >= startDate && entryDate < endDate && entry.action === 'used') {
                if (entry.type === 'ink') {
                    inkConsumption[entry.color] += entry.quantity;
                } else if (entry.type === 'paper') {
                    const key = `${entry.width}x${entry.length}`;
                    paperConsumption[key] = (paperConsumption[key] || 0) + entry.quantity;
                }
            }
        });

        setConsumptionSummary({ ink: inkConsumption, paper: paperConsumption });
    }, [history, reportPeriod, reportStartDate]); // Re-run when history, period, or start date changes

    // Main App UI rendering
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans text-gray-800">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-6">
                    Printer Supply Tracker
                </h1>

                {/* Navigation Buttons */}
                <div className="flex justify-center space-x-4 mb-6">
                    <button
                        onClick={() => setCurrentPage('supplies')}
                        className={`py-2 px-6 rounded-xl font-semibold transition duration-200 ease-in-out transform hover:scale-105
                            ${currentPage === 'supplies' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Supplies
                    </button>
                    <button
                        onClick={() => setCurrentPage('reports')}
                        className={`py-2 px-6 rounded-xl font-semibold transition duration-200 ease-in-out transform hover:scale-105
                            ${currentPage === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Reports
                    </button>
                </div>

                {/* Display User ID for reference */}
                {userId && (
                    <div className="text-sm text-gray-500 text-center mb-4 p-2 bg-gray-50 rounded-xl break-all">
                        Your User ID: <span className="font-mono">{userId}</span>
                    </div>
                )}

                {/* Message display */}
                {message && (
                    <div className="bg-blue-100 text-blue-800 p-3 rounded-xl mb-4 text-center">
                        {message}
                    </div>
                )}

                {/* Conditional Rendering based on currentPage */}
                {currentPage === 'supplies' ? (
                    <>
                        {/* Date Selection for Entries */}
                        <div className="mb-8 p-4 bg-gray-50 rounded-xl shadow-inner flex items-center justify-center">
                            <label htmlFor="entryDate" className="text-lg font-semibold text-gray-700 mr-3">
                                Entry Date:
                            </label>
                            <input
                                id="entryDate"
                                type="date"
                                value={manualDate}
                                onChange={(e) => setManualDate(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Ink Level Section */}
                        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-inner">
                            <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">
                                Ink Levels
                            </h2>
                            {/* Iterate over ink colors to display each one */}
                            {Object.entries(inkLevels).map(([color, level]) => (
                                <div key={color} className="mb-4 last:mb-0">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center justify-between">
                                        {color.charAt(0).toUpperCase() + color.slice(1)}
                                        <span className="text-3xl font-extrabold text-blue-900">{level}</span>
                                    </h3>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => updateInkSupply(color, 1)}
                                            className={`flex-1 ${getInkColorClasses(color)} text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 ease-in-out transform hover:scale-105`}
                                        >
                                            <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                            Add
                                        </button>
                                        <button
                                            onClick={() => updateInkSupply(color, -1)}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 ease-in-out transform hover:scale-105"
                                        >
                                            <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6"></path></svg>
                                            Use
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Paper Rolls Section */}
                        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-inner">
                            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">
                                Paper Rolls (By Dimensions)
                            </h2>
                            {groupedPaperRolls.length === 0 ? (
                                <p className="text-center text-gray-600 mb-4">No paper rolls in stock.</p>
                            ) : (
                                <ul className="space-y-3 mb-6">
                                    {groupedPaperRolls.map((group) => (
                                        <li key={group.width + 'x' + group.length} className="flex items-center justify-between bg-green-100 p-3 rounded-lg shadow-sm">
                                            <span className="text-lg font-medium text-green-800">
                                                {group.width} x {group.length} ({group.quantity} rolls)
                                            </span>
                                            <button
                                                onClick={() => removePaperRoll(group.width, group.length)}
                                                className="ml-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-xl shadow-sm transition duration-200 ease-in-out transform hover:scale-105"
                                            >
                                                Use One
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="flex flex-col space-y-3">
                                <input
                                    type="number"
                                    value={newRollWidth}
                                    onChange={(e) => setNewRollWidth(e.target.value)}
                                    className="p-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="New Roll Width (e.g., 24)"
                                    min="0"
                                />
                                <input
                                    type="number"
                                    value={newRollLength}
                                    onChange={(e) => setNewRollLength(e.target.value)}
                                    className="p-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="New Roll Length (e.g., 150)"
                                    min="0"
                                />
                                <input
                                    type="number"
                                    value={newRollQuantity}
                                    onChange={(e) => setNewRollQuantity(e.target.value)}
                                    className="p-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Quantity"
                                    min="1"
                                />
                                <button
                                    onClick={addPaperRoll}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 ease-in-out transform hover:scale-105"
                                >
                                    Add New Roll(s)
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <ReportsPage
                        history={history}
                        isAuthReady={isAuthReady}
                        reportPeriod={reportPeriod}
                        setReportPeriod={setReportPeriod}
                        reportStartDate={reportStartDate}
                        setReportStartDate={setReportStartDate}
                        consumptionSummary={consumptionSummary}
                        setConsumptionSummary={setConsumptionSummary}
                        generateConsumptionReport={generateConsumptionReport}
                    />
                )}
            </div>
        </div>
    );
};

export default App;
