// Main script
let isEditMode = false;

// DOM Elements
const timetableBody = document.getElementById('timetable-body');
const editBtn = document.getElementById('edit-btn');
const saveBtn = document.getElementById('save-btn');
const exportBtn = document.getElementById('export-btn');

// Function to initialize and sync timetable data
function initializeTimetable() {
    const { database, ref, onValue } = window.firebaseDB;
    const timetableRef = ref(database, 'timetable');

    // Listen for real-time updates
    onValue(timetableRef, (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
            renderTimetable(data);
        }
    }, (error) => {
        console.error('Database sync error:', error);
        showNotification('Lost connection to database');
    });
}

// Function to update cell content
function updateCell(rowIndex, colIndex, value) {
    const { database, ref, set } = window.firebaseDB;
    const cellRef = ref(database, `timetable/${rowIndex}/periods/${colIndex}`);

    set(cellRef, value)
        .then(() => {
            showNotification('Change saved');
        })
        .catch(error => {
            console.error('Error updating cell:', error);
            showNotification('Failed to save changes');
        });
}

// Function to update the display
function updateTimetableDisplay(data) {
    const tbody = document.getElementById('timetable-body');
    if (!tbody) return;

    data.forEach((row, rowIndex) => {
        const cells = tbody.children[rowIndex]?.getElementsByTagName('td');
        if (cells) {
            row.periods.forEach((period, colIndex) => {
                const textarea = cells[colIndex]?.querySelector('.editable');
                if (textarea && textarea.value !== period) {
                    textarea.value = period;
                }
            });
        }
    });
}

// Handle cell updates
function handleCellUpdate(event) {
    if (!window.isEditMode) return;

    const textarea = event.target;
    const cell = textarea.closest('td');
    const row = cell.closest('tr');
    const rowIndex = Array.from(row.parentNode.children).indexOf(row);
    const colIndex = Array.from(row.children).indexOf(cell);

    updateCell(rowIndex, colIndex, textarea.value);
}

// Function to render the timetable
function renderTimetable(data) {
    const tbody = document.getElementById('timetable-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Render data rows
    data.forEach((dayData, rowIndex) => {
        if (!dayData || !dayData.day) return;

        const row = document.createElement('tr');

        // Day cell
        const dayCell = document.createElement('td');
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cell-content';
        dayDiv.textContent = dayData.day;
        dayDiv.contentEditable = isEditMode;
        dayDiv.dataset.rowIndex = rowIndex;
        dayDiv.dataset.type = 'day';
        dayCell.appendChild(dayDiv);
        row.appendChild(dayCell);

        // Period cells
        if (Array.isArray(dayData.periods)) {
            dayData.periods.forEach((periodData, colIndex) => {
                const cell = document.createElement('td');
                const div = document.createElement('div');
                div.className = 'cell-content';
                div.innerText = periodData || '';
                div.contentEditable = isEditMode;
                div.dataset.rowIndex = rowIndex;
                div.dataset.colIndex = colIndex;
                div.dataset.type = 'period';
                div.style.whiteSpace = 'pre-wrap';
                cell.appendChild(div);
                row.appendChild(cell);
            });
        }

        tbody.appendChild(row);
    });
}

// Function to adjust textarea heights
function adjustTextareaHeights() {
    document.querySelectorAll('.editable').forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });
}

// Function to handle individual cell edits
function handleCellEdit(event) {
    const textarea = event.target;
    const rowIndex = parseInt(textarea.dataset.rowIndex);
    const colIndex = parseInt(textarea.dataset.colIndex);

    // Store the change in a temporary object
    if (!window.pendingChanges) {
        window.pendingChanges = {};
    }
    if (!window.pendingChanges[rowIndex]) {
        window.pendingChanges[rowIndex] = {};
    }
    window.pendingChanges[rowIndex][colIndex] = textarea.value;

    // Adjust height of the textarea
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Function to save changes
function saveAllChanges() {
    const { database, ref, set } = window.firebaseDB;
    const timetableRef = ref(database, 'timetable');

    // Collect all data from the table
    const updatedData = [];
    const rows = Array.from(document.querySelectorAll('#timetable-body tr'));

    rows.forEach(row => {
        const dayCellContent = row.querySelector('.cell-content[data-type="day"]');
        const periodCells = row.querySelectorAll('.cell-content[data-type="period"]');

        if (dayCellContent) {
            const dayData = {
                day: dayCellContent.innerText.trim(),
                periods: Array.from(periodCells).map(cell => cell.innerText)
            };
            updatedData.push(dayData);
        }
    });

    // Save to Firebase
    set(timetableRef, updatedData)
        .then(() => {
            showNotification('Changes saved successfully!');

            // Update the display with only the data rows
            renderTimetable(updatedData);

            // Exit edit mode after successful save
            toggleEditMode();
        })
        .catch(error => {
            console.error('Error saving changes:', error);
            showNotification('Failed to save changes. Please try again.');
        });
}

// Function to prompt for password
function checkPassword() {
    const password = "Qwerty1234";
    const userInput = prompt("Please enter password to edit:");

    if (userInput === password) {
        return true;
    } else if (userInput !== null) { // If user clicked OK but wrong password
        showNotification('Incorrect password!', 'error');
    }
    return false;
}

// Function to toggle edit mode
function toggleEditMode() {
    if (!isEditMode) {
        // Check password when entering edit mode
        if (!checkPassword()) {
            return; // Don't enable edit mode if password is incorrect
        }
    }

    isEditMode = !isEditMode;

    document.querySelectorAll('.cell-content').forEach(div => {
        div.contentEditable = isEditMode;
    });

    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');

    if (editBtn && saveBtn) {
        editBtn.style.display = isEditMode ? 'none' : 'inline-block';
        saveBtn.style.display = isEditMode ? 'inline-block' : 'none';
    }

    showNotification(isEditMode ? 'Edit mode enabled' : 'View mode enabled');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTimetable();

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllChanges);
    }

    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', toggleEditMode);
    }

    // Add window resize listener for textarea adjustment
    window.addEventListener('resize', adjustTextareaHeights);

    // Add export button listener
    if (exportBtn) {
        exportBtn.addEventListener('click', captureTableScreenshot);
    }

    // Check if html2canvas is loaded
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas not loaded');
        utils.showNotification('Screenshot feature not available', 'error');
    }

    initializeSearch();

    // Initialize theme toggle
    initializeThemeToggle();

    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark && !localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
    }

    // Initialize drag and drop
    initializeDragAndDrop();

    // Re-initialize after any content changes
    const observer = new MutationObserver(() => {
        initializeDragAndDrop();
    });

    observer.observe(document.getElementById('timetable'), {
        childList: true,
        subtree: true
    });

    // Enable scrolling for all textareas regardless of edit mode
    document.querySelectorAll('.editable').forEach(textarea => {
        textarea.addEventListener('wheel', (e) => {
            if (textarea.scrollHeight > textarea.clientHeight) {
                const scrollTop = textarea.scrollTop;
                const scrollHeight = textarea.scrollHeight;
                const height = textarea.clientHeight;

                // Allow scrolling if there's more content
                if ((e.deltaY < 0 && scrollTop > 0) ||
                    (e.deltaY > 0 && scrollTop < scrollHeight - height)) {
                    e.preventDefault();
                    e.stopPropagation();
                    textarea.scrollTop += e.deltaY;
                }
            }
        }, { passive: false });
    });

    // Add notification styles if not already present
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideUp 0.3s ease-out, fadeOut 0.3s ease-out 2.7s;
        }

        @keyframes slideUp {
            from { transform: translate(-50%, 100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }

        @keyframes fadeOut {
            to { opacity: 0; }
        }

        [data-theme="dark"] .notification {
            background: #6366f1;
        }

        .notification.error {
            background-color: #dc3545 !important;
        }
    `;
    document.head.appendChild(style);

    // Add event listeners to cells
    document.querySelectorAll('.editable').forEach(textarea => {
        textarea.addEventListener('blur', handleCellUpdate);
    });
});

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Reset functionality
function resetToDefaultData() {
    if (confirm('Are you sure you want to reset to default data? This cannot be undone.')) {
        localStorage.setItem('timetableData', JSON.stringify(timetableData));
        renderTimetable(timetableData);
        utils.showNotification('Timetable reset to default!');
    }
}

// Add this function for better screenshot handling
function captureTableScreenshot() {
    const timetableContainer = document.getElementById('timetable-container');
    
    // Create a clone with full dimensions
    const clone = timetableContainer.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    
    // Set clone dimensions to full scrollable width
    clone.style.width = `${timetableContainer.scrollWidth}px`;
    clone.style.overflow = 'visible';
    clone.style.height = 'auto';
    
    // Remove horizontal scrollbar from clone
    clone.style.overflowX = 'hidden';
    
    document.body.appendChild(clone);

    // Wait for clone to render
    setTimeout(() => {
        html2canvas(clone, {
            scale: 2,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            windowWidth: clone.scrollWidth,
            windowHeight: clone.scrollHeight,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff'
        }).then(canvas => {
            try {
                const image = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = image;
                downloadLink.download = `timetable_${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                showNotification('Full timetable exported!');
            } catch (error) {
                console.error('Export failed:', error);
                showNotification('Export failed. Please try again.', 'error');
            }
            document.body.removeChild(clone);
        }).catch(error => {
            console.error('Capture failed:', error);
            document.body.removeChild(clone);
        });
    }, 500); // Increased timeout for rendering
}

// Add this function to initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const cells = document.querySelectorAll('#timetable td .cell-content');
        let foundMatch = false;

        cells.forEach(cell => {
            const cellContent = cell.innerText.toLowerCase();
            const cellParent = cell.closest('td');

            if (searchTerm === '') {
                // Reset styles if search is empty
                cellParent.classList.remove('highlight-match');
            } else if (cellContent.includes(searchTerm)) {
                // Highlight matching cells
                cellParent.classList.add('highlight-match');
                foundMatch = true;
            } else {
                // Remove highlight from non-matching cells
                cellParent.classList.remove('highlight-match');
            }
        });

        // Show/hide no results message
        updateNoResultsMessage(searchTerm, foundMatch);
    });
}

// Function to update the no results message
function updateNoResultsMessage(searchTerm, foundMatch) {
    let messageElement = document.getElementById('no-results-message');

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'no-results-message';
        messageElement.className = 'no-results-message';
        document.querySelector('.search-container').appendChild(messageElement);
    }

    if (searchTerm && !foundMatch) {
        messageElement.textContent = `No results found for "${searchTerm}"`;
        messageElement.style.display = 'block';
    } else {
        messageElement.style.display = 'none';
    }
}

// Theme Toggle Implementation
function initializeThemeToggle() {
    // Create theme toggle button if it doesn't exist
    let themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        themeToggle = document.createElement('button');
        themeToggle.id = 'theme-toggle';
        themeToggle.className = 'action-btn theme-toggle';
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';

        // Add to button container
        const buttonContainer = document.querySelector('.button-container');
        if (buttonContainer) {
            buttonContainer.appendChild(themeToggle);
        }
    }

    // Get initial theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Show notification
        utils.showNotification(`Switched to ${newTheme} mode`);
    });
}

// Update theme icon
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});

function initializeDragAndDrop() {
    const textareas = document.querySelectorAll('.editable');
    let draggedTextarea = null;

    textareas.forEach(textarea => {
        // Enable dragging
        textarea.addEventListener('mousedown', function (e) {
            if (!isEditMode) return;
            draggedTextarea = this;
            this.classList.add('dragging');
        });

        // Handle drag over
        textarea.addEventListener('mouseover', function (e) {
            if (!isEditMode || !draggedTextarea) return;
            if (this !== draggedTextarea) {
                this.classList.add('drag-over');
            }
        });

        // Handle drag leave
        textarea.addEventListener('mouseout', function (e) {
            if (!isEditMode) return;
            this.classList.remove('drag-over');
        });

        // Handle drop
        textarea.addEventListener('mouseup', function (e) {
            if (!isEditMode || !draggedTextarea) return;

            if (this !== draggedTextarea) {
                // Swap content
                const tempValue = this.value;
                this.value = draggedTextarea.value;
                draggedTextarea.value = tempValue;
            }

            // Clean up
            textareas.forEach(ta => {
                ta.classList.remove('dragging');
                ta.classList.remove('drag-over');
            });
            draggedTextarea = null;
        });
    });

    // Clean up if mouse is released outside of any textarea
    document.addEventListener('mouseup', function () {
        if (draggedTextarea) {
            textareas.forEach(ta => {
                ta.classList.remove('dragging');
                ta.classList.remove('drag-over');
            });
            draggedTextarea = null;
        }
    });
}
function exportToWord() {
    const timetable = document.getElementById('timetable').cloneNode(true);
    
    // Process cells to maintain exact line breaks
    timetable.querySelectorAll('td, th').forEach(cell => {
        // Convert newlines to Word-compatible line breaks
        const content = cell.innerText;
        cell.innerHTML = content.replace(/\n/g ,'<w:br/>') // Word-specific line breaks
                               .replace(/\n/g ,'<br>');    // Fallback for other apps
        
        // Add Word-specific styling
        cell.setAttribute('style', 
            'border: 1pt solid #4f46e5; ' +
            'padding: 4pt; ' +
            'vertical-align: top; ' +
            'mso-height-source: userset; ' + // Word height control
            'height: auto !important;' +
            'white-space: pre-wrap;' // Preserve whitespace
        );
    });

    // Create Word-specific XML structure
    const html = `
        <html xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
            <meta charset="UTF-8">
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    mso-border-alt: solid #4f46e5 1.0pt; /* Word borders */
                }
                th {
                    background: #4f46e5;
                    color: white;
                    padding: 8pt;
                    mso-pattern: auto none; /* Word shading */
                }
                td:first-child {
                    background: #f8fafc;
                    font-weight: 600;
                    mso-pattern: auto none;
                }
            </style>
        </head>
        <body>
            <h1 style="color: #4f46e5; text-align: center;">
                Timetable<br/>
                <span style="font-size: 12pt; color: #666;">
                    ${new Date().toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </span>
            </h1>
            ${timetable.outerHTML
                .replace(/<td/g, '<td style="mso-height-source:userset; height:auto;"')
                .replace(/<table/g, '<table align="center"')}
        </body>
        </html>
    `;

    // Create and trigger download
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Timetable_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Word document generated with perfect formatting!');
}
// Add to DOMContentLoaded event
document.getElementById('word-export').addEventListener('click', exportToWord);