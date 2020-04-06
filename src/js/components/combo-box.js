const keymap = require("receptor/keymap");
const select = require("../utils/select");
const behavior = require("../utils/behavior");
const { prefix: PREFIX } = require("../config");
const { CLICK } = require("../events");

const BODY = "body";
const COMBO_BOX = `.${PREFIX}-combo-box`;

const INPUT_CLASS = `${PREFIX}-combo-box__input`;
const LIST_CLASS = `${PREFIX}-combo-box__list`;
const LIST_OPTION_CLASS = `${PREFIX}-combo-box__list-option`;
const STATUS_CLASS = `${PREFIX}-combo-box__status`;
const LIST_OPTION_SELECTED_CLASS = `${LIST_OPTION_CLASS}--selected`;

const SELECT = `.${PREFIX}-combo-box__select`;
const INPUT = `.${INPUT_CLASS}`;
const LIST = `.${LIST_CLASS}`;
const LIST_OPTION = `.${LIST_OPTION_CLASS}`;
const LIST_OPTION_SELECTED = `.${LIST_OPTION_SELECTED_CLASS}`;
const STATUS = `.${STATUS_CLASS}`;

const isPrintableKeyCode = (keyCode) => {
  return (
    (keyCode > 47 && keyCode < 58) || // number keys
    keyCode === 32 ||
    keyCode === 8 || // spacebar or backspace
    (keyCode > 64 && keyCode < 91) || // letter keys
    (keyCode > 95 && keyCode < 112) || // numpad keys
    (keyCode > 185 && keyCode < 193) || // ;=,-./` (in order)
    (keyCode > 218 && keyCode < 223) // [\]' (in order)
  );
}

const getComboBoxElements = (el) => {
  const comboBoxEl = el.closest(COMBO_BOX);

  if (!comboBoxEl) {
    throw new Error(`Element is missing outer ${COMBO_BOX}`);
  }

  const selectEl = comboBoxEl.querySelector(SELECT);

  if (!selectEl) {
    throw new Error(`${COMBO_BOX} is missing inner ${SELECT}`);
  }

  const inputEl = comboBoxEl.querySelector(INPUT);
  const listEl = comboBoxEl.querySelector(LIST);
  const statusEl = comboBoxEl.querySelector(STATUS);
  const currentOptionEl = comboBoxEl.querySelector(LIST_OPTION_SELECTED);

  return { comboBoxEl, selectEl, inputEl, listEl, statusEl, currentOptionEl };
};

/**
 * Enhance the combo box element
 *
 * @param {Element} el The initial element within the combobox component
 */
const enhanceComboBox = el => {
  const { comboBoxEl, selectEl } = getComboBoxElements(el);

  const selectId = selectEl.id;
  const listId = `${selectId}--list`;
  const assistiveHintID = `${selectId}--assistiveHint`;

  comboBoxEl.insertAdjacentHTML(
    "beforeend",
    [
      `<input 
        id="${selectId}" 
        class="${INPUT_CLASS}"
        role='combobox'
        autocapitalize="none" 
        autocomplete="off"
        type="text" 
        aria-owns="${listId}"
        aria-autocomplete="list" 
        aria-expanded="false"
        aria-describedby="${assistiveHintID}"
      >`,
      `<ul 
        id="${listId}" 
        class="${LIST_CLASS}" 
        role="listbox"
        hidden>
      </ul>`,
      `<div 
        class="${STATUS_CLASS} usa-sr-only"
        role="status"
        aria-live="polite">
      </div>`,
      `<span id="${assistiveHintID}" class="usa-sr-only">
        When autocomplete results are available use up and down arrows to review and enter to select.
        Touch device users, explore by touch or with swipe gestures.
      </span>`
    ].join("")
  );

  selectEl.setAttribute("aria-hidden", "true");
  selectEl.setAttribute("tabindex", "-1");
  selectEl.classList.add("usa-sr-only");
  selectEl.id = "";
};

const displayList = el => {
  const { selectEl, inputEl, listEl, statusEl } = getComboBoxElements(el);

  const listOptionBaseId = `${listEl.id}--option-`;

  const inputValue = (inputEl.value || "").toLowerCase();

  let optionEl;
  const options = [];
  for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
    optionEl = selectEl.options[i];
    if (
      optionEl.value &&
      (!inputValue || optionEl.text.toLowerCase().indexOf(inputValue) !== -1)
    ) {
      options.push(optionEl);
    }
  }

  const numOptions = options.length;
  const optionHtml = options
    .map(
      (option, index) =>
        `<li
      id="${listOptionBaseId}${index}"
      class="${LIST_OPTION_CLASS}"
      tabindex="-1"
      role=option
      aria-selected="false"
      aria-setsize="${options.length}" 
      aria-posinset="${index + 1}"
      data-option-value="${option.value}"
    >${option.text}</li>`
    )
    .join("");

  const noResults = `<li class="${LIST_OPTION_CLASS}--no-results">No results found</li>`;

  listEl.hidden = false;
  listEl.innerHTML = numOptions ? optionHtml : noResults;

  inputEl.setAttribute("aria-expanded", "true");

  statusEl.innerHTML = numOptions
    ? `${numOptions} result${numOptions > 1 ? "s" : ""} available.`
    : '"No results.';
};

const hideList = el => {
  const { inputEl, listEl, statusEl } = getComboBoxElements(el);

  statusEl.innerHTML = "";

  inputEl.setAttribute("aria-expanded", "false");

  listEl.innerHTML = "";
  listEl.hidden = true;
};

const selectItem = listOptionEl => {
  const { comboBoxEl, selectEl, inputEl } = getComboBoxElements(listOptionEl);

  selectEl.value = listOptionEl.getAttribute("data-option-value");
  inputEl.value = listOptionEl.textContent;
  hideList(comboBoxEl);
  inputEl.focus();
};

const handlePrintableKey = input => {
  displayList(input);
};

const completeSelection = el => {
  const { selectEl, inputEl, statusEl, currentOptionEl } = getComboBoxElements(el);

  statusEl.textContent = "";

  if (currentOptionEl) {
    selectEl.value = currentOptionEl.getAttribute("data-option-value");
    inputEl.value = currentOptionEl.textContent;
    return;
  }

  const inputValue = (inputEl.value || "").toLowerCase();

  if (inputValue) {
    let optionEl;
    for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
      optionEl = selectEl.options[i];
      if (optionEl.text.toLowerCase() === inputValue) {
        selectEl.value = optionEl.value;
        inputEl.value = optionEl.text;
        return;
      }
    }
  }

  selectEl.value = "";
  inputEl.value = "";
};

const highlightOption = (el, currentEl, nextEl) => {
  const { inputEl, listEl } = getComboBoxElements(el);

  if (currentEl) {
    currentEl.setAttribute("aria-selected", "false");
    currentEl.classList.remove(LIST_OPTION_SELECTED_CLASS);
  }

  if (nextEl) {
    inputEl.setAttribute("aria-activedescendant", nextEl.id);
    nextEl.setAttribute("aria-selected", "true");
    nextEl.classList.add(LIST_OPTION_SELECTED_CLASS);

    const optionBottom = nextEl.offsetTop + nextEl.offsetHeight;
    const currentBottom = listEl.scrollTop + listEl.offsetHeight;

    if (optionBottom > currentBottom) {
      listEl.scrollTop = optionBottom - listEl.offsetHeight;
    }

    if (nextEl.offsetTop < listEl.scrollTop) {
      listEl.scrollTop = nextEl.offsetTop;
    }
  } else {
    inputEl.removeAttribute("aria-activedescendant");
  }
};

const handleEnter = (event) => {
  const { comboBoxEl, listEl } = getComboBoxElements(event.target);

  if (!listEl.hidden) {
    event.preventDefault();
    completeSelection(comboBoxEl);
    hideList(comboBoxEl);
  }
};

const handleEscape = (event) => {
  const { comboBoxEl, inputEl } = getComboBoxElements(event.target);
  hideList(comboBoxEl);
  inputEl.focus();
};

const handleUp = (event) => {
  event.preventDefault();
  const { comboBoxEl, inputEl, currentOptionEl } = getComboBoxElements(event.target);
  const nextOptionEl = currentOptionEl && currentOptionEl.previousSibling;

  highlightOption(comboBoxEl, currentOptionEl, nextOptionEl);

  if (currentOptionEl && !nextOptionEl) {
    hideList(comboBoxEl);
    inputEl.focus();
  }
};

const handleDown = (event) => {
  event.preventDefault();
  const { comboBoxEl, listEl, currentOptionEl } = getComboBoxElements(event.target);

  if (listEl.hidden) {
    displayList(comboBoxEl);
  }

  const nextOptionEl = currentOptionEl
    ? currentOptionEl.nextSibling
    : listEl.querySelector(`${LIST_OPTION}`);

  if (nextOptionEl) {
    highlightOption(comboBoxEl, currentOptionEl, nextOptionEl);
  }
};

const handleTab = (event) => {
  const { comboBoxEl } = getComboBoxElements(event.target);

  completeSelection(comboBoxEl);
  hideList(comboBoxEl);
};

const comboBox = behavior(
  {
    [CLICK]: {
      [INPUT]() {
        displayList(this);
      },
      [LIST_OPTION]() {
        selectItem(this);
      },
      [BODY](event) {
        select(COMBO_BOX).forEach(comboBoxEl => {
          if (!comboBoxEl.contains(event.target)) {
            completeSelection(comboBoxEl);
            hideList(comboBoxEl);
          }
        });
      }
    },
    keydown: {
      [INPUT]: keymap({
        ArrowUp: handleUp,
        ArrowDown: handleDown,
        Escape: handleEscape,
        Enter: handleEnter,
        Tab: handleTab
      })
    },
    keyup: {
      [INPUT](event) {
        if (isPrintableKeyCode(event.keyCode)) {
          handlePrintableKey(this);
        }
      }
    }
  },
  {
    init(root) {
      select(SELECT, root).forEach(selectEl => {
        enhanceComboBox(selectEl);
      });
    }
  }
);

module.exports = comboBox;
