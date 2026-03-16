document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        historyContainer: document.createElement('div'),
        calculateBtn: document.getElementById('calculate-btn'),
        result: document.getElementById('result'),
        formulaText: document.querySelector('.formula-text'),
        inputs: {
            amount: document.getElementById('amount'),
            interest: document.getElementById('interest'),
            frequency: document.getElementById('frequency'),
            years: document.getElementById('years'),
            deductionPercent: document.getElementById('deduction-percent'),
            deductionAmount: document.getElementById('deduction-amount')
        },
        deductionType: {
            whole: document.getElementById('deduction-type-whole'),
            gains: document.getElementById('deduction-type-gains')
        },
        modal: document.getElementById('data-modal'),
        modalDataTable: document.getElementById('modal-data-table'),
        closeBtn: document.querySelector('.close-btn')
    };

    // Force the interest input to be text to allow trailing '.'
    elements.inputs.interest.setAttribute('type', 'text');

    // Add history container to the page
    elements.historyContainer.className = 'history-container';
    elements.result.parentNode.insertBefore(elements.historyContainer, elements.result.nextSibling);

    // Constants
    const COLORS = {
        ERROR: '#ff5252',
        SUCCESS: '#30ba11'
    };

    const VALIDATION_RULES = {
        amount: { min: 0, max: 999999999999, required: true },
        interest: { min: 0, max: 1000, required: true, allowDecimal: true },
        frequency: { min: 1, max: 10000, required: true },
        years: { min: 1, max: 1000, required: false, defaultValue: 1 },
        deductionPercent: { min: 0, max: 100, required: false, defaultValue: 0, allowDecimal: true },
        deductionAmount: { min: 0, max: 999999999999, required: false, defaultValue: 0, allowDecimal: true }
    };

    // Create an array of inputs for easier navigation
    const inputFields = Object.values(elements.inputs);

    // Helper function: if the value ends with '.' and decimals are allowed,
    // append '0' for calculation purposes.
    function sanitizeValue(value, rules) {
        if (rules.allowDecimal && value.endsWith('.')) {
            return value + '0';
        }
        return value;
    }

    // Update formula text based on current input values
    function updateFormulaText() {
        const amount = elements.inputs.amount.value;
        const interest = elements.inputs.interest.value;
        const frequency = elements.inputs.frequency.value;
        const years = elements.inputs.years.value;
        
        // Calculate the interest rate for display (e.g., 2.5% becomes 1.025)
        const interestRate = (parseFloat(interest) / 100) + 1;
        const interestRateFormatted = interestRate.toFixed(3);
        
        // Update the formula text
        elements.formulaText.textContent = `= ${amount} × (${interestRateFormatted})^(${frequency}×${years})`;
    }
    
    // Initialize
    function init() {
        // Set default values for all required inputs
        elements.inputs.amount.value = '10000';
        elements.inputs.interest.value = '5';
        elements.inputs.frequency.value = '1';
        elements.inputs.years.value = '1';
        
        // Update formula text initially
        updateFormulaText();
        
        setupInputValidation();
        setupBlurValidation();
        setupKeyboardNavigation();
        elements.calculateBtn.addEventListener('click', handleCalculate);
        
        // Add input event listeners to update formula text
        Object.values(elements.inputs).forEach(input => {
            input.addEventListener('input', updateFormulaText);
        });
        
        // Call initially to display history if available
        displayRecentInputs();

        // Modal event listeners
        elements.closeBtn.addEventListener('click', () => {
            elements.modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == elements.modal) {
                elements.modal.style.display = 'none';
            }
        });
    }

    // Immediate input validation – allow trailing dot by not removing it.
    function setupInputValidation() {
        inputFields.forEach(input => {
            input.addEventListener('input', function() {
                const inputName = this.id;
                const rules = VALIDATION_RULES[inputName];
                if (rules.allowDecimal) {
                    handleDecimalInput(this);
                } else {
                    this.value = this.value.replace(/[^0-9]/g, '');
                }
            });
        });
    }

    // Handle decimal input with cursor position preservation.
    function handleDecimalInput(inputElement) {
        const oldValue = inputElement.value;
        const cursorPosition = inputElement.selectionStart;
        
        // Remove non-numeric characters except dot; allow trailing dot.
        let newValue = oldValue.replace(/[^0-9.]/g, '');
        
        // Ensure only one dot is allowed.
        const decimalCount = (newValue.match(/\./g) || []).length;
        if (decimalCount > 1) {
            const firstDecimalIndex = newValue.indexOf('.');
            newValue = newValue.substring(0, firstDecimalIndex + 1) + 
                       newValue.substring(firstDecimalIndex + 1).replace(/\./g, '');
        }
        
        inputElement.value = newValue;
        
        if (oldValue !== newValue) {
            let removedBeforeCursor = 0;
            for (let i = 0; i < cursorPosition; i++) {
                if (oldValue[i] !== newValue[i]) {
                    removedBeforeCursor++;
                }
            }
            const newPosition = Math.max(0, cursorPosition - removedBeforeCursor);
            inputElement.setSelectionRange(newPosition, newPosition);
        }
    }

    // Validate input on blur, sanitizing trailing decimals for calculation purposes.
    function setupBlurValidation() {
        Object.entries(elements.inputs).forEach(([name, input]) => {
            input.addEventListener('blur', function() {
                const rules = VALIDATION_RULES[name];
                // Sanitize trailing '.' (append '0') on blur.
                this.value = sanitizeValue(this.value, rules);
                const numValue = parseFloat(this.value);
                if (this.value && (isNaN(numValue) || numValue < rules.min)) {
                    this.style.borderColor = COLORS.ERROR;
                } else {
                    this.style.borderColor = '';
                }
            });
        });
    }

    // Keyboard navigation for form inputs.
    function setupKeyboardNavigation() {
        inputFields.forEach((input, index) => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index === inputFields.length - 1) {
                        elements.calculateBtn.click();
                    } else {
                        inputFields[index + 1].focus();
                    }
                }
                if (e.key === 'Backspace' && this.value === '' && index > 0) {
                    e.preventDefault();
                    inputFields[index - 1].focus();
                }
            });
        });
    }

    // Validate all inputs and sanitize them before parsing.
    function validateInputs() {
        const values = {};
        let errorMessage = '';

        for (const [name, input] of Object.entries(elements.inputs)) {
            const rules = VALIDATION_RULES[name];
            let value = input.value; // Keep the raw value for user experience.
            const sanitizedValue = sanitizeValue(value, rules);
            const numValue = parseFloat(sanitizedValue);

            if (!value && !rules.required && rules.defaultValue !== undefined) {
                values[name] = rules.defaultValue;
                continue;
            }
            if (rules.required && (!value || isNaN(numValue))) {
                errorMessage = `Please enter a valid ${name}`;
                break;
            } else if (value && (isNaN(numValue) || numValue < rules.min || numValue > rules.max)) {
                errorMessage = `Please enter a valid ${name} (${rules.min}-${rules.max})`;
                break;
            }
            values[name] = numValue;
        }

        return {
            isValid: errorMessage === '',
            errorMessage,
            values
        };
    }

    // Calculate compound interest using the formula.
    function calculateCompoundInterest(amount, interest, frequency, years) {
        const interestRate = interest / 100;
        const base = 1 + interestRate;
        const exponent = frequency * years;
        const logResult = Math.log10(amount) + exponent * Math.log10(base);
        if (logResult > 15) {
            return { result: Infinity, yearlyData: [] };
        }

        let yearlyData = [];
        let currentAmount = amount;

        for (let year = 1; year <= years; year++) {
            const yearExponent = frequency;
            const yearResult = currentAmount * Math.pow(base, yearExponent);
            const growth = yearResult - currentAmount;
            const growthPercentage = (growth / currentAmount) * 100;

            yearlyData.push({
                year,
                amount: yearResult,
                growth,
                growthPercentage
            });

            currentAmount = yearResult;
        }

        return {
            result: currentAmount,
            yearlyData
        };
    }

    function calculateWithDeductions(amount, interest, frequency, years, deductionPercent = 0, deductionAmount = 0, deductOnGainsOnly = true) {
        const interestRate = interest / 100;
        let currentAmount = amount;
        let totalDeducted = 0;
        let yearlyData = [];

        for (let year = 1; year <= years; year++) {
            const compounded = currentAmount * Math.pow(1 + interestRate, frequency);

            let gain = deductOnGainsOnly ? compounded - currentAmount : compounded;
            let deduction = (gain * deductionPercent) / 100 + deductionAmount;

            const afterDeduction = compounded - deduction;
            totalDeducted += deduction;

            yearlyData.push({
                year,
                amount: afterDeduction,
                deduction
            });

            currentAmount = afterDeduction;
        }

        return {
            finalAmount: currentAmount,
            totalDeducted,
            yearlyData
        };
    }

    function handleCalculate() {
        const validation = validateInputs();
        if (!validation.isValid) {
            displayResult(validation.errorMessage, null, null, true);
            return;
        }

        const { amount, interest, frequency, years, deductionPercent, deductionAmount } = validation.values;

        const standardResult = calculateCompoundInterest(amount, interest, frequency, years);
        let deductionResults = null;

        if (deductionPercent > 0 || deductionAmount > 0) {
            deductionResults = calculateWithDeductions(amount, interest, frequency, years, deductionPercent, deductionAmount, elements.deductionType.gains.checked);
        }

        const inputValues = {
            amount: parseFloat(elements.inputs.amount.value),
            interest: parseFloat(elements.inputs.interest.value),
            frequency: parseInt(elements.inputs.frequency.value),
            years: parseInt(elements.inputs.years.value),
            deductionPercent: parseFloat(elements.inputs.deductionPercent.value || 0),
            deductionAmount: parseFloat(elements.inputs.deductionAmount.value || 0),
            deductionType: elements.deductionType.gains.checked ? 'gains' : 'whole'
        };
        saveInputs(inputValues);

        displayResult(standardResult.result, amount, deductionResults, false, standardResult.yearlyData);
    }

    // Save inputs to local storage
    function saveInputs(inputValues) {
        const recentInputs = JSON.parse(localStorage.getItem('recentInputs') || '[]');
        
        // Check if the input already exists
        const alreadyExists = recentInputs.some(input => 
            JSON.stringify(input) === JSON.stringify(inputValues)
        );

        if (!alreadyExists) {
            recentInputs.unshift(inputValues);
            if (recentInputs.length > 10) {
                recentInputs.pop();
            }
            localStorage.setItem('recentInputs', JSON.stringify(recentInputs));
            displayRecentInputs();
        }
    }

    // Display recent inputs
    function displayRecentInputs() {
        const recentInputs = JSON.parse(localStorage.getItem('recentInputs') || '[]');
        if (recentInputs.length === 0) {
            elements.historyContainer.innerHTML = '';
            return;
        }

        let recentInputsHTML = `
            <div class="recent-inputs-section">
                <h3>Recent Inputs (Right-click for details)</h3>
                <div class="recent-inputs-list">
                    ${recentInputs.map((inputs, index) => {
                        let text = `A: ${inputs.amount}, G: ${inputs.interest}%, C: ${inputs.frequency}, P: ${inputs.years}`;
                        if (inputs.deductionPercent > 0 || inputs.deductionAmount > 0) {
                            text += `, D%: ${inputs.deductionPercent}%, DA: ${inputs.deductionAmount}`;
                            if(inputs.deductionType) {
                                text += ` (${inputs.deductionType})`;
                            }
                        }
                        return `<button class="recent-input-btn" data-index="${index}">${text}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        elements.historyContainer.innerHTML = recentInputsHTML;

        // Add event listeners to the buttons
        document.querySelectorAll('.recent-input-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const selectedInputs = recentInputs[index];
                populateInputs(selectedInputs);
            });

            button.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                const index = this.getAttribute('data-index');
                const selectedInputs = recentInputs[index];
                const standardResult = calculateCompoundInterest(selectedInputs.amount, selectedInputs.interest, selectedInputs.frequency, selectedInputs.years);
                openModalWithData(standardResult.yearlyData);
            });
        });
    }

    function populateInputs(inputs) {
        elements.inputs.amount.value = inputs.amount;
        elements.inputs.interest.value = inputs.interest;
        elements.inputs.frequency.value = inputs.frequency;
        elements.inputs.years.value = inputs.years;
        elements.inputs.deductionPercent.value = inputs.deductionPercent;
        elements.inputs.deductionAmount.value = inputs.deductionAmount;
        if (inputs.deductionType === 'whole') {
            elements.deductionType.whole.checked = true;
        } else {
            elements.deductionType.gains.checked = true;
        }
        updateFormulaText();
    }

    function openModalWithData(yearlyData) {
        let tableHTML = `
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Growth</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${yearlyData.map(data => `
                        <tr>
                            <td>${data.year}</td>
                            <td>${data.growth.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>${data.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        elements.modalDataTable.innerHTML = tableHTML;
        elements.modal.style.display = 'block';
    }

    // Display the result or error message.
    function displayResult(result, initialAmount, deductionResults, isError = false, yearlyData = []) {
        if (isError) {
            elements.result.innerHTML = result;
            elements.result.style.color = COLORS.ERROR;
        } else if (result === Infinity || result > Number.MAX_SAFE_INTEGER) {
            elements.result.innerHTML = 'Value is too large to display';
            elements.result.style.color = COLORS.ERROR;
        } else {
            const years = parseInt(elements.inputs.years.value);
            // Calculate increase in value and percentage for standard compound interest
            const increase = result - initialAmount;
            const percentageIncrease = (increase / initialAmount) * 100;
            
            // Format the standard results
            const formattedResult = result.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            const formattedIncrease = increase.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            const formattedPercentage = percentageIncrease.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            let firstPeriodPercentageHTML = '';
            if (years > 1 && yearlyData.length > 0) {
                const firstPeriod = yearlyData[0];
                const firstPeriodIncrease = firstPeriod.growth;
                const firstPeriodPercentage = (firstPeriodIncrease / initialAmount) * 100;
                firstPeriodPercentageHTML = `(First Period: ${firstPeriodPercentage.toFixed(2)}%)`;
            }
            
            // Create HTML for the results
            let resultHTML = `
                <div class="result-section">
                    <h3>Standard Compounding Gain</h3>
                    <div class="result-value">Final Amount: ${formattedResult}</div>
                    <div class="result-increase">Increase: ${formattedIncrease}</div>
                    <div class="result-percentage">Percentage Increase: ${formattedPercentage}% ${firstPeriodPercentageHTML}</div>
                    <div class="yearly-breakdown">
                        <h4>Period-by-Period Breakdown</h4>
                        <table class="breakdown-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Growth</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${yearlyData.map(data => `
                                    <tr>
                                        <td>${data.year}</td>
                                        <td>${data.growth.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        <td>${data.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Add deduction results if available
            if (deductionResults) {
                const deductionIncrease = deductionResults.finalAmount - initialAmount;
                const deductionPercentageIncrease = (deductionIncrease / initialAmount) * 100;
                
                const formattedDeductionResult = deductionResults.finalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                const formattedDeductionIncrease = deductionIncrease.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                const formattedDeductionPercentage = deductionPercentageIncrease.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                let firstPeriodDeductionPercentageHTML = '';
                if (years > 1 && deductionResults.yearlyData.length > 0) {
                    const firstPeriod = deductionResults.yearlyData[0];
                    const firstPeriodIncrease = firstPeriod.amount - initialAmount;
                    const firstPeriodPercentage = (firstPeriodIncrease / initialAmount) * 100;
                    firstPeriodDeductionPercentageHTML = `(First Period: ${firstPeriodPercentage.toFixed(2)}%)`;
                }
                
                resultHTML += `
                    <div class="result-section deduction-result">
                        <h3>With Annual Deductions</h3>
                        <div class="result-value">Final Amount: ${formattedDeductionResult}</div>
                        <div class="result-increase">Increase: ${formattedDeductionIncrease}</div>
                        <div class="result-percentage">Percentage Increase: ${formattedDeductionPercentage}% ${firstPeriodDeductionPercentageHTML}</div>
                        <div class="deduction-details">
                            <div>Total Deducted: ${deductionResults.totalDeducted.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                        <div class="yearly-breakdown">
                            <h4>Period-by-Period Breakdown</h4>
                            <table class="breakdown-table">
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Pre-Deduction</th>
                                        <th>Deduction</th>
                                        <th>Post-Deduction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${deductionResults.yearlyData.map(data => `
                                        <tr>
                                            <td>${data.year}</td>
                                            <td>${(data.amount + data.deduction).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td>${data.deduction.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td>${data.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
            
            elements.result.innerHTML = resultHTML;
            elements.result.style.color = COLORS.SUCCESS;
        }
    }

    init();
});