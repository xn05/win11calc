window.addEventListener("DOMContentLoaded", () => {
    const historyEl = document.getElementById("history");
    const resultEl = document.getElementById("result");
    const keys = document.getElementById("keys");
    const timePrimary = document.querySelector(".tray-time .primary");
    const timeSecondary = document.querySelector(".tray-time .secondary");
    const calculatorEl = document.querySelector(".calculator");
    const titlebarEl = document.querySelector(".titlebar");
    const taskCalcBtn = document.querySelector(".task-btn.calc");
    const minimizeBtn = document.querySelector(".title-controls .min");

    if (taskCalcBtn) taskCalcBtn.classList.add("running");

    const dragState = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

    function setCalculatorVisible(show) {
        if (show) {
            calculatorEl.classList.remove("hidden");
            taskCalcBtn?.classList.add("active");
        } else {
            calculatorEl.classList.add("hidden");
            taskCalcBtn?.classList.remove("active");
        }
    }

    function ensurePositioned() {
        const prevTransition = calculatorEl.style.transition;
        calculatorEl.style.transition = "none";
        const rect = calculatorEl.getBoundingClientRect();
        calculatorEl.style.left = `${rect.left}px`;
        calculatorEl.style.top = `${rect.top}px`;
        calculatorEl.style.transform = "none";
        requestAnimationFrame(() => {
            calculatorEl.style.transition = prevTransition;
        });
    }

    function beginDrag(e) {
        if (e.button !== 0) return;
        if (e.target.closest(".title-controls")) return;
        const transformValue = getComputedStyle(calculatorEl).transform;
        if (transformValue && transformValue !== "none") ensurePositioned();
        dragState.active = true;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.startLeft = parseFloat(calculatorEl.style.left);
        dragState.startTop = parseFloat(calculatorEl.style.top);
        titlebarEl.setPointerCapture(e.pointerId);
    }

    function handleDrag(e) {
        if (!dragState.active) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const maxLeft = Math.max(0, window.innerWidth - calculatorEl.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - calculatorEl.offsetHeight);
        const nextLeft = Math.min(Math.max(0, dragState.startLeft + dx), maxLeft);
        const nextTop = Math.min(Math.max(0, dragState.startTop + dy), maxTop);
        calculatorEl.style.left = `${nextLeft}px`;
        calculatorEl.style.top = `${nextTop}px`;
    }

    function endDrag(e) {
        if (!dragState.active) return;
        dragState.active = false;
        if (titlebarEl.hasPointerCapture(e.pointerId)) {
            titlebarEl.releasePointerCapture(e.pointerId);
        }
    }

    titlebarEl.addEventListener("pointerdown", beginDrag);
    titlebarEl.addEventListener("pointermove", handleDrag);
    titlebarEl.addEventListener("pointerup", endDrag);
    titlebarEl.addEventListener("pointercancel", endDrag);

    taskCalcBtn?.addEventListener("click", () => {
        const isHidden = calculatorEl.classList.contains("hidden");
        setCalculatorVisible(isHidden);
    });

    minimizeBtn?.addEventListener("click", () => {
        setCalculatorVisible(false);
    });

    setCalculatorVisible(true);

    const state = {
        display: "0",
        operand: null,
        operator: null,
        waitingForSecond: false,
        memory: null,
        history: ""
    };

    function renderOp(op) {
        if (op === "*") return "×";
        if (op === "/") return "÷";
        if (op === "mod") return "mod";
        if (op === "power") return "^";
        if (op === "root") return "root";
        return op;
    }

    function updateDisplay() {
        resultEl.textContent = state.display;
        historyEl.textContent = state.history;
    }

    function inputDigit(digit) {
        if (state.waitingForSecond) {
            state.display = digit;
            state.waitingForSecond = false;
        } else {
            state.display = state.display === "0" ? digit : state.display + digit;
        }
        updateDisplay();
    }

    function inputDecimal() {
        if (state.waitingForSecond) {
            state.display = "0.";
            state.waitingForSecond = false;
        } else if (!state.display.includes(".")) {
            state.display += ".";
        }
        updateDisplay();
    }

    function clearEntry() {
        state.display = "0";
        updateDisplay();
    }

    function clearAll() {
        state.display = "0";
        state.operand = null;
        state.operator = null;
        state.waitingForSecond = false;
        state.history = "";
        updateDisplay();
    }

    function backspace() {
        if (state.waitingForSecond) return;
        state.display = state.display.length > 1 ? state.display.slice(0, -1) : "0";
        updateDisplay();
    }

    function setOperator(op) {
        const current = parseFloat(state.display);
        if (state.operator && state.waitingForSecond) {
            state.operator = op;
            state.history = `${state.operand} ${renderOp(op)}`;
            updateDisplay();
            return;
        }
        if (state.operand === null) {
            state.operand = current;
        } else if (state.operator) {
            state.operand = compute(state.operand, current, state.operator);
            state.display = String(state.operand);
        }
        state.operator = op;
        state.waitingForSecond = true;
        state.history = `${state.operand} ${renderOp(op)}`;
        updateDisplay();
    }

    function compute(a, b, op) {
        switch (op) {
            case "+": return a + b;
            case "-": return a - b;
            case "*": return a * b;
            case "/": return b === 0 ? NaN : a / b;
            case "mod": return b === 0 ? NaN : a % b;
            case "power": return Math.pow(a, b);
            case "root": return b === 0 ? NaN : Math.pow(a, 1 / b);
            default: return b;
        }
    }

    function handleEquals() {
        if (state.operator === null || state.waitingForSecond) return;
        const a = state.operand ?? 0;
        const b = parseFloat(state.display);
        const result = compute(a, b, state.operator);
        state.history = `${a} ${renderOp(state.operator)} ${b} =`;
        state.display = formatNumber(result);
        state.operand = result;
        state.operator = null;
        state.waitingForSecond = false;
        updateDisplay();
    }

    function unary(action) {
        const current = parseFloat(state.display);
        let result = current;
        switch (action) {
            case "sqrt":
                result = current < 0 ? NaN : Math.sqrt(current);
                state.history = `√(${current})`;
                break;
            case "square":
                result = current * current;
                state.history = `sqr(${current})`;
                break;
            case "reciprocal":
                result = current === 0 ? NaN : 1 / current;
                state.history = `1/(${current})`;
                break;
            case "abs":
                result = Math.abs(current);
                state.history = `abs(${current})`;
                break;
            case "exp":
                result = Math.exp(current);
                state.history = `exp(${current})`;
                break;
            case "cube":
                result = current * current * current;
                state.history = `cube(${current})`;
                break;
            case "inverse":
                result = current === 0 ? NaN : 1 / current;
                state.history = `${current}⁻¹`;
                break;
            case "pow10":
                result = Math.pow(10, current);
                state.history = `10^(${current})`;
                break;
            case "ln":
                result = current <= 0 ? NaN : Math.log(current);
                state.history = `ln(${current})`;
                break;
            case "factorial": {
                if (current < 0 || !Number.isInteger(current)) {
                    result = NaN;
                } else {
                    let res = 1;
                    for (let i = 2; i <= current; i++) {
                        res *= i;
                        if (!Number.isFinite(res)) break;
                    }
                    result = res;
                }
                state.history = `${current}!`;
                break;
            }
            default:
                break;
        }
        state.display = formatNumber(result);
        state.waitingForSecond = false;
        updateDisplay();
    }

    function percent() {
        const current = parseFloat(state.display);
        if (state.operand !== null && state.operator) {
            const value = (state.operand * current) / 100;
            state.display = formatNumber(value);
        } else {
            state.display = formatNumber(current / 100);
        }
        updateDisplay();
    }

    function negate() {
        if (state.display === "0") return;
        state.display = state.display.startsWith("-") ? state.display.slice(1) : "-" + state.display;
        updateDisplay();
    }

    function inputConstant(value, label) {
        state.display = formatNumber(value);
        state.history = label;
        state.waitingForSecond = false;
        updateDisplay();
    }

    let secondMode = false;
    function toggleSecond() {
        secondMode = !secondMode;
        // Visual toggle only for now
        const btn = document.querySelector("[data-action='second-toggle']");
        if (btn) btn.classList.toggle("active", secondMode);
    }

    function formatNumber(num) {
        if (!isFinite(num)) return "Cannot divide by zero";
        const str = String(num);
        return str.length > 14 ? Number(num.toPrecision(12)).toString() : str;
    }

    function memory(action) {
        const current = parseFloat(state.display);
        switch (action) {
            case "memory-store":
                state.memory = current;
                break;
            case "memory-add":
                state.memory = (state.memory ?? 0) + current;
                break;
            case "memory-subtract":
                state.memory = (state.memory ?? 0) - current;
                break;
            case "memory-clear":
                state.memory = null;
                break;
            case "memory-recall":
                if (state.memory !== null) {
                    state.display = formatNumber(state.memory);
                    state.waitingForSecond = false;
                }
                break;
            default:
                break;
        }
        updateDisplay();
    }

    keys.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const digit = btn.dataset.digit;
        const operator = btn.dataset.operator;
        const action = btn.dataset.action;

        if (digit !== undefined) return inputDigit(digit);
        if (operator) return setOperator(operator);

        switch (action) {
            case "decimal": return inputDecimal();
            case "clear-entry": return clearEntry();
            case "clear": return clearAll();
            case "backspace": return backspace();
            case "equals": return handleEquals();
            case "sqrt": return unary("sqrt");
            case "square": return unary("square");
            case "reciprocal": return unary("reciprocal");
            case "abs": return unary("abs");
            case "exp": return unary("exp");
            case "cube": return unary("cube");
            case "inverse": return unary("inverse");
            case "pow10": return unary("pow10");
            case "ln": return unary("ln");
            case "factorial": return unary("factorial");
            case "pi": return inputConstant(Math.PI, "π");
            case "e-const": return inputConstant(Math.E, "e");
            case "percent": return percent();
            case "negate": return negate();
            case "second-toggle": return toggleSecond();
            case "memory-clear":
            case "memory-recall":
            case "memory-add":
            case "memory-subtract":
            case "memory-store":
                return memory(action);
            default:
                return;
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key >= "0" && e.key <= "9") return inputDigit(e.key);
        if (e.key === ".") return inputDecimal();
        if (["+", "-", "*", "/"].includes(e.key)) return setOperator(e.key);
        if (e.key === "Enter" || e.key === "=") return handleEquals();
        if (e.key === "Backspace") return backspace();
        if (e.key === "Escape") return clearAll();
    });

    updateDisplay();

    function pad2(n) { return n.toString().padStart(2, "0"); }

    function updateClock() {
        const now = new Date();
        let h = now.getHours();
        const m = pad2(now.getMinutes());
        const s = pad2(now.getSeconds());
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0) h = 12;
        if (timePrimary) timePrimary.textContent = `${h}:${m}:${s} ${ampm}`;
        const month = pad2(now.getMonth() + 1);
        const day = pad2(now.getDate());
        const year = now.getFullYear();
        if (timeSecondary) timeSecondary.textContent = `${month}/${day}/${year}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
});