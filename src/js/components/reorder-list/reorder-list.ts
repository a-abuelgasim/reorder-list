/* IMPORTS */
// import { NAME } from '../../common/constants.js';
// import { autoID } from '../../common/functions.js';

const NAME = 'ace';


/* COMPONENT NAME */
export const REORDER_LIST = `${NAME}-reorder-list`;


/* CONSTANTS */
export const ATTRS = {
	BTN: `${REORDER_LIST}-item-btn`,
	ITEM: `${REORDER_LIST}-item`,
	ITEM_GRABBED: `${REORDER_LIST}-item-grabbed`,
	LIST: `${REORDER_LIST}-list`,
	REORDERING: `${REORDER_LIST}-reordering`,
};


export const EVENTS = {
// 	IN: {
// 		INCOMING_EVENT: `${REORDER_LIST}-incoming-event`,
// 	},
	OUT: {
		READY: `${REORDER_LIST}-ready`,
	},
};


/* CLASS */
export default class ReorderList extends HTMLElement {
	private cursorStartPos: number | undefined;
	private liEls: HTMLLIElement[] = [];
	private moveDistance: number | undefined;
	private moveStarted = false;
	private movingLiEls = false;
	private nextSiblingMidpoint: number | undefined;
	private prevSiblingMidpoint: number | undefined;
	private selectedLiEl: HTMLLIElement | undefined;
	private selectedLiElIndex: number | undefined;
	private selectedLiElIndexDiff: number | undefined;
	private ulEl: HTMLUListElement | HTMLOListElement | undefined;
	private ulElBottom: number | undefined;
	private ulElTop: number | undefined;
	private prevSiblingIndex: number | undefined;
	private nextSiblingIndex: number | undefined;
	private targetLiElIndex: number | undefined;
	private liElKbGrabbed = false;


	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.endMove = this.endMove.bind(this);
		this.mouseDownHandler = this.mouseDownHandler.bind(this);
		this.setNextSiblingMidpoint = this.setNextSiblingMidpoint.bind(this);
		this.setPrevSiblingMidpoint = this.setPrevSiblingMidpoint.bind(this);
		this.translateLiEl = this.translateLiEl.bind(this);
		this.updateSiblingLiIndexes = this.updateSiblingLiIndexes.bind(this);
		this.windowMouseMoveHandler = this.windowMouseMoveHandler.bind(this);

		this.focusOutHandler = this.focusOutHandler.bind(this);
		this.keydownHandler = this.keydownHandler.bind(this);
		this.moveSelectedToTarget = this.moveSelectedToTarget.bind(this);
		this.undoKeyboardMove = this.undoKeyboardMove.bind(this);
	}


	public connectedCallback(): void {
		console.log('connected Callback');
		// this.id = this.id || autoID(REORDER_LIST);

		/* GET DOM ELEMENTS */
		this.ulEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement;
		this.liEls = [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];


		/* GET DOM DATA */
		// this.someData = this.getAttribute(ATTRS.ATTR_NAME);


		/* SET DOM DATA */
		// this.setAttribute(ATTRS.ATTR_NAME, 'some-value');


		/* ADD EVENT LISTENERS */
		this.ulEl.addEventListener('focusout', this.focusOutHandler);
		this.ulEl.addEventListener('keydown', this.keydownHandler);
		this.ulEl.addEventListener('mousedown', this.mouseDownHandler);
		window.addEventListener('mouseup', this.endMove);


		/* INITIALISATION */
		// Add any initialisation code here


		// Dispatch 'ready' event
		// window.dispatchEvent(new CustomEvent(EVENTS.OUT.READY, {
		// 	'detail': {
		// 		'id': this.id,
		// 	}
		// }));
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.ulEl!.removeEventListener('mousedown', this.mouseDownHandler);
		window.removeEventListener('mouseup', this.endMove);
	}


	private focusOutHandler(e: Event): void {
		const targetEl = (e.target as Element).closest(`[${ATTRS.BTN}]`);
		if (!targetEl) {
			return;
		}

		this.undoKeyboardMove();
	}


	private keydownHandler(e: KeyboardEvent): void {
		const target = e.target as HTMLElement;
		const selectedLiEl = target.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		if (!selectedLiEl) {
			return;
		}

		const keydownOnBtn = target.closest(`[${ATTRS.BTN}]`);
		const parentLiIndex = this.liEls.indexOf(selectedLiEl);
		const keyPressed = e.key;
		switch(keyPressed) {
			case 'Escape':
				this.undoKeyboardMove();
				break;
			case ' ':
			case 'Enter':
				e.preventDefault();
				if (!this.liElKbGrabbed && keydownOnBtn) {
					this.liElKbGrabbed = true;
					selectedLiEl.classList.add('grabbed');
					this.selectedLiElIndex = parentLiIndex;
					this.selectedLiEl = selectedLiEl;
					this.targetLiElIndex = this.selectedLiElIndex;
					break;
				}
				if (this.liElKbGrabbed && selectedLiEl) {
					this.moveSelectedToTarget();
				}
				break;
			case 'ArrowUp':
			case 'ArrowDown':
			case 'Home':
			case 'End': {
				if (!this.liElKbGrabbed) {
					return;
				}

				e.preventDefault();
				const lastLiElIndex = this.liEls.length - 1;

				if (keyPressed.includes('Arrow')) {
					const direction = keyPressed == 'ArrowUp' ? -1 : 1;
					this.targetLiElIndex += direction;
					if (this.targetLiElIndex < 0) {
						this.targetLiElIndex = lastLiElIndex;
					} else if (this.targetLiElIndex > lastLiElIndex) {
						this.targetLiElIndex = 0;
					} else if (this.targetLiElIndex == this.selectedLiElIndex) {
						this.targetLiElIndex += direction;
					}
				} else {
					this.targetLiElIndex = keyPressed == 'Home' ? 0 : lastLiElIndex;
				}

				this.liEls.forEach((liEl, index) => {
					if (index == this.targetLiElIndex) {
						liEl.classList.add('targeted');
					} else {
						liEl.classList.remove('targeted');
					}
				});
				break;
			}
		}
	}


	private moveSelectedToTarget(): void {
		if (this.targetLiElIndex > this.selectedLiElIndex) {
			this.targetLiElIndex += 1;
		}
		this.ulEl!.insertBefore(this.selectedLiEl, this.liEls[this.targetLiElIndex]);
		(this.selectedLiEl.querySelector(`[${ATTRS.BTN}]`) as HTMLButtonElement).focus();
		this.liEls = [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];
	}


	private undoKeyboardMove(): void {
		this.liEls.forEach(liEl => liEl.classList.remove('grabbed', 'targeted'));
		this.liElKbGrabbed = false;
	}


	private endMove(): void {
		if (!this.moveStarted || !this.ulEl || !this.selectedLiEl || this.selectedLiElIndex == undefined || this.selectedLiElIndexDiff == undefined) {
			return;
		}

		const newSelectedLiElIndex = this.selectedLiElIndex + this.selectedLiElIndexDiff;
		if (this.selectedLiElIndexDiff) {
			const insertBeforeElIndex = this.selectedLiElIndexDiff < 0 ?
				newSelectedLiElIndex :
				newSelectedLiElIndex + 1;
			this.ulEl!.insertBefore(this.selectedLiEl, this.liEls[insertBeforeElIndex]);
			this.liEls.splice(this.selectedLiElIndex, 1);
			this.liEls.splice(newSelectedLiElIndex, 0, this.selectedLiEl);
		}

		this.ulEl.removeAttribute(ATTRS.REORDERING);
		this.liEls.forEach(liEl => liEl.style.transform = '');
		this.selectedLiEl.removeAttribute(ATTRS.ITEM_GRABBED);
		this.selectedLiEl.style.top = '';

		this.moveStarted = false;
		window.removeEventListener('mousemove', this.windowMouseMoveHandler);
	}


	private mouseDownHandler(e: Event): void {
		if (!this.ulEl) {
			return;
		}

		const targetEl = e.target as Element;
		if (!targetEl || !targetEl.closest(`[${ATTRS.BTN}]`)) {
			return;
		}

		this.selectedLiEl = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		if (!this.selectedLiEl) {
			return;
		}

		this.moveStarted = true;
		this.cursorStartPos = (e as MouseEvent).pageY;

		const ulRect = this.ulEl.getBoundingClientRect();
		this.ulElTop = ulRect.top + window.scrollY;
		this.ulElBottom = ulRect.bottom + window.scrollY;

		this.ulEl.setAttribute(ATTRS.REORDERING, '');
		this.selectedLiEl.setAttribute(ATTRS.ITEM_GRABBED, '');

		this.selectedLiElIndexDiff = 0;
		this.selectedLiElIndex = this.liEls.indexOf(this.selectedLiEl);

		this.prevSiblingIndex = this.selectedLiElIndex - 1;
		this.setPrevSiblingMidpoint(this.prevSiblingIndex);
		this.nextSiblingIndex = this.selectedLiElIndex + 1;
		this.setNextSiblingMidpoint(this.nextSiblingIndex);

		// We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead;
		const selectedLiElStyles = window.getComputedStyle(this.selectedLiEl);
		this.moveDistance = this.selectedLiEl.offsetHeight + parseInt(selectedLiElStyles.marginTop) + parseInt(selectedLiElStyles.marginBottom);

		window.addEventListener('mousemove', this.windowMouseMoveHandler);
	}


	private setNextSiblingMidpoint(liElIndex: number): void {
		this.nextSiblingMidpoint = Number.POSITIVE_INFINITY;
		const nextSibling = this.liEls[liElIndex];
		if (nextSibling) {
			const nextSiblingRect = nextSibling.getBoundingClientRect();
			this.nextSiblingMidpoint = nextSiblingRect.top + window.scrollY + nextSiblingRect.height / 2;
		}
	}


	private setPrevSiblingMidpoint(liElIndex: number): void {
		this.prevSiblingMidpoint = Number.NEGATIVE_INFINITY;
		const prevSibling = this.liEls[liElIndex];
		if (prevSibling) {
			const prevSiblingRect = prevSibling.getBoundingClientRect();
			this.prevSiblingMidpoint = prevSiblingRect.top + window.scrollY + prevSiblingRect.height / 2;
		}
	}



	private translateLiEl(index: number, translateVal: number): void {
		const targetLiEl = this.liEls[index];
		const currentTransform = targetLiEl.style.transform;
		targetLiEl.style.transform = currentTransform ?
			'' :
			`translate3d(0px, ${translateVal}px, 0px)`;
	}


	private updateSiblingLiIndexes(direction: -1 | 1): void {
		if (this.nextSiblingIndex == undefined || this.prevSiblingIndex == undefined) {
			return;
		}

		this.nextSiblingIndex += direction;
		this.prevSiblingIndex += direction;

		// Choose index of previous li if index is that of grabbedEl
		if (this.prevSiblingIndex == this.selectedLiElIndex) {
			this.prevSiblingIndex += direction;
		}
		if (this.nextSiblingIndex == this.selectedLiElIndex) {
			this.nextSiblingIndex += direction;
		}
	}


	private windowMouseMoveHandler(e: MouseEvent): void {
		if (this.movingLiEls || !this.selectedLiEl) {
			return;
		}

		if (
			this.cursorStartPos == undefined ||
			this.moveDistance == undefined ||
			this.nextSiblingIndex == undefined ||
			this.nextSiblingMidpoint == undefined ||
			this.prevSiblingIndex == undefined ||
			this.prevSiblingMidpoint == undefined ||
			this.selectedLiElIndex == undefined ||
			this.selectedLiElIndexDiff == undefined ||
			this.ulElBottom == undefined ||
			this.ulElTop == undefined
		) {
			return;
		}

		const movementY = e.movementY;
		if (movementY == 0) {
			return;
		}

		const cursorPos = e.pageY;

		// Anchor element to move pointer
		this.selectedLiEl.style.top = `${cursorPos - this.cursorStartPos}px`;
		// Scroll page with grabbed element
		if (cursorPos >= this.ulElTop && cursorPos <= this.ulElBottom) {
			this.selectedLiEl.scrollIntoView({
				behaviour: 'smooth',
				block: 'nearest',
			} as ScrollIntoViewOptions);
		}

		// If cursor crosses previous or next sibling li's midpoint
		if (cursorPos < this.prevSiblingMidpoint || cursorPos > this.nextSiblingMidpoint) {
			this.movingLiEls = true;
			const moveDirection = movementY < 0 ? -1 : 1;
			const movingUp = moveDirection == -1;
			const translateVal = -(this.moveDistance * moveDirection);

			while (
				(movingUp && this.prevSiblingIndex >= 0) ||
				(!movingUp && this.nextSiblingIndex < this.liEls.length)
			){
				if (
					(movingUp && cursorPos >= this.prevSiblingMidpoint) ||
					(!movingUp && cursorPos <= this.nextSiblingMidpoint)
				){
					break;
				}

				const elToTranslateIndex = movingUp ? this.prevSiblingIndex : this.nextSiblingIndex;
				this.translateLiEl(elToTranslateIndex, translateVal);
				this.updateSiblingLiIndexes(moveDirection);

				// Update stored sibling midpoints
				if (movingUp) {
					// Can't use setNextSiblingMidpoint() because new sibling will transition
					this.nextSiblingMidpoint = this.prevSiblingMidpoint + this.moveDistance;
					this.setPrevSiblingMidpoint(this.prevSiblingIndex);
				} else {
					// Can't use setPrevSiblingMidpoint() because new sibling will transition
					this.prevSiblingMidpoint = this.nextSiblingMidpoint - this.moveDistance;
					this.setNextSiblingMidpoint(this.nextSiblingIndex);
				}
				this.selectedLiElIndexDiff += moveDirection;
			}

			this.movingLiEls = false;
		}
	}
}


/* REGISTER CUSTOM ELEMENT */
document.addEventListener('DOMContentLoaded', () => {
	customElements.define(REORDER_LIST, ReorderList);
});
