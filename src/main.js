import "./tailwind.css";
import "./styles.scss";

const display = document.querySelector("#display");
const keypad = document.querySelector("#keypad");
const themeToggle = document.querySelector("#theme-toggle");

const MAX_INPUT_DIGITS = 15;
const THEME_STORAGE_KEY = "calculator-theme";

let displayValue = "0";
let firstOperand = null;
let operator = null;
let waitingForOperand = false;
let justCalculated = false;

function resetCalculator() {
  displayValue = "0";
  firstOperand = null;
  operator = null;
  waitingForOperand = false;
  justCalculated = false;
}

function recoverFromError() {
  if (displayValue === "Error") resetCalculator();
}

function inputDigit(digit) {
  recoverFromError();

  if (waitingForOperand || justCalculated) {
    displayValue = digit;
    waitingForOperand = false;
    justCalculated = false;
    return;
  }

  const digitCount = displayValue.replace(/[^0-9]/g, "").length;
  if (digitCount >= MAX_INPUT_DIGITS) return;
  displayValue = displayValue === "0" ? digit : displayValue + digit;
}

function inputDecimal() {
  recoverFromError();

  if (waitingForOperand || justCalculated) {
    displayValue = "0.";
    waitingForOperand = false;
    justCalculated = false;
  } else if (!displayValue.includes(".")) {
    displayValue += ".";
  }
}

function tidyResult(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Number.parseFloat(value.toPrecision(12));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function calculate(left, right, selectedOperator) {
  switch (selectedOperator) {
    case "+": return tidyResult(left + right);
    case "-": return tidyResult(left - right);
    case "*": return tidyResult(left * right);
    case "/": return right === 0 ? "Error" : tidyResult(left / right);
    default: return String(right);
  }
}

function chooseOperator(nextOperator) {
  recoverFromError();
  const inputValue = Number(displayValue);

  if (operator && waitingForOperand) {
    operator = nextOperator;
    return;
  }

  if (firstOperand === null) {
    firstOperand = inputValue;
  } else if (operator) {
    const result = calculate(firstOperand, inputValue, operator);
    displayValue = result;

    if (result === "Error") {
      firstOperand = null;
      operator = null;
      waitingForOperand = false;
      justCalculated = true;
      return;
    }

    firstOperand = Number(result);
  }

  operator = nextOperator;
  waitingForOperand = true;
  justCalculated = false;
}

function handleEquals() {
  if (displayValue === "Error" || operator === null || firstOperand === null || waitingForOperand) return;

  displayValue = calculate(firstOperand, Number(displayValue), operator);
  firstOperand = null;
  operator = null;
  waitingForOperand = false;
  justCalculated = true;
}

function deleteDigit() {
  if (displayValue === "Error" || waitingForOperand || justCalculated) {
    displayValue = "0";
    waitingForOperand = false;
    justCalculated = false;
    return;
  }

  displayValue = displayValue.length <= 1 || (displayValue.startsWith("-") && displayValue.length === 2)
    ? "0"
    : displayValue.slice(0, -1);
}

function formatDisplay(value) {
  if (value === "Error" || /e/i.test(value)) return value;

  const negative = value.startsWith("-");
  const [integerPart, decimalPart] = (negative ? value.slice(1) : value).split(".");
  const integer = Number(integerPart || "0").toLocaleString("en-US");
  const formatted = decimalPart === undefined ? integer : `${integer}.${decimalPart}`;
  return negative ? `−${formatted}` : formatted;
}

function updateDisplay() {
  const formatted = formatDisplay(displayValue);
  display.textContent = formatted;

  if (formatted.length > 16) display.dataset.size = "small";
  else if (formatted.length > 11) display.dataset.size = "medium";
  else delete display.dataset.size;
}

function handleAction(action) {
  if (action === "decimal") inputDecimal();
  if (action === "delete") deleteDigit();
  if (action === "reset") resetCalculator();
  if (action === "equals") handleEquals();
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.number !== undefined) inputDigit(button.dataset.number);
  else if (button.dataset.operator) chooseOperator(button.dataset.operator);
  else if (button.dataset.action) handleAction(button.dataset.action);

  updateDisplay();
});

function findKeyboardButton(key) {
  const selectors = {
    Enter: '[data-action="equals"]',
    "=": '[data-action="equals"]',
    Backspace: '[data-action="delete"]',
    Delete: '[data-action="delete"]',
    Escape: '[data-action="reset"]',
    ".": '[data-action="decimal"]',
    ",": '[data-action="decimal"]',
    "+": '[data-operator="+"]',
    "-": '[data-operator="-"]',
    "*": '[data-operator="*"]',
    x: '[data-operator="*"]',
    X: '[data-operator="*"]',
    "/": '[data-operator="/"]',
  };

  const selector = /^\d$/.test(key) ? `[data-number="${key}"]` : selectors[key];
  return selector ? keypad.querySelector(selector) : null;
}

document.addEventListener("keydown", (event) => {
  const button = findKeyboardButton(event.key);
  if (!button) return;

  event.preventDefault();
  button.click();
  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 100);
});

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (["1", "2", "3"].includes(savedTheme)) return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "1" : "2";
}

function applyTheme(theme) {
  const selectedTheme = ["1", "2", "3"].includes(String(theme)) ? String(theme) : "1";
  document.documentElement.dataset.theme = selectedTheme;
  themeToggle.value = selectedTheme;
  themeToggle.setAttribute("aria-label", `Select colour theme: theme ${selectedTheme} selected`);
  localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
}

themeToggle.addEventListener("input", (event) => applyTheme(event.target.value));

applyTheme(getInitialTheme());
updateDisplay();
