document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sensorForm');
    const tableBody = document.getElementById('dataTableBody');
    const riskResultBox = document.getElementById('riskResult');
    const riskScoreValue = document.getElementById('riskScore');
    const riskStatusBadge = document.getElementById('riskStatus');

    // On Initial Load, explicitly fetch the table data
    fetchData();

    // Handle Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const soil = document.getElementById('soil').value;
        const water = document.getElementById('water').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Analyzing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soil: parseFloat(soil), water: parseFloat(water) })
            });

            const data = await response.json();

            if (response.ok) {
                // Instantly update the large risk dashboard metric
                displayRisk(data.risk);
                // Background refresh the table
                fetchData();
                // Clear inputs
                form.reset();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Submission failed:', error);
            alert('Failed to connect to the server.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    /**
     * Shows the Result Panel and applies colors based on danger thresholds
     */
    function displayRisk(risk) {
        riskResultBox.classList.remove('hidden');
        riskScoreValue.textContent = risk.toFixed(2);
        
        // Remove old classes
        riskStatusBadge.className = 'status-badge';
        riskScoreValue.style.color = '';

        if (risk < 50) {
            riskStatusBadge.classList.add('indicator-safe');
            riskStatusBadge.textContent = 'Stable';
            riskScoreValue.style.color = 'var(--risk-low)';
        } else if (risk < 80) {
            riskStatusBadge.classList.add('indicator-warn');
            riskStatusBadge.textContent = 'Warning';
            riskScoreValue.style.color = 'var(--risk-med)';
        } else {
            riskStatusBadge.classList.add('indicator-danger');
            riskStatusBadge.textContent = 'Critical';
            riskScoreValue.style.color = 'var(--risk-high)';
        }
    }

    /**
     * Fetch recent recordings from the SQLite DB and render them to the table
     */
    async function fetchData() {
        try {
            const response = await fetch('/data');
            const records = await response.json();
            
            if (!response.ok) throw new Error(records.error || 'Server error');
            
            tableBody.innerHTML = '';
            
            if (records.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No historical data recorded yet.</td></tr>`;
                return;
            }

            records.forEach(record => {
                const tr = document.createElement('tr');
                
                // Format the ISO time to a readable local string
                const dateObj = new Date(record.time);
                const timeString = isNaN(dateObj) ? record.time : dateObj.toLocaleString(); 
                
                // Render visually formatted risk inside the table
                const riskVal = parseFloat(record.risk).toFixed(2);
                let riskColorClass = 'indicator-safe';
                if (record.risk >= 80) riskColorClass = 'indicator-danger';
                else if (record.risk >= 50) riskColorClass = 'indicator-warn';
                
                tr.innerHTML = `
                    <td>${timeString}</td>
                    <td>${record.soil}</td>
                    <td>${record.water}</td>
                    <td>
                        <span style="font-weight: 600" class="${riskColorClass}" style="border:none; padding:0; background:transparent;">
                            ${riskVal}
                        </span>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Failed to fetch historical data:', error);
            tableBody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--risk-high)">Failed to load data</td></tr>`;
        }
    }
});
