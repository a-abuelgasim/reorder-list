/* IMPORTS */
const NAME = 'ace';


/* COMPONENT NAME */
export const REORDER_LIST = `${NAME}-reorder-list`;


/* CONSTANTS */
export const ATTRS = {
	BTN: `${REORDER_LIST}-item-btn`,
	GRABBED_ITEM: `${REORDER_LIST}-grabbed-item`,
	ITEM: `${REORDER_LIST}-item`,
	LIST: `${REORDER_LIST}-list`,
	REORDERING: `${REORDER_LIST}-reordering`,
};


export const EVENTS = {
	OUT: {
		READY: `${REORDER_LIST}-ready`,
	},
};


enum Sibling {
	Prev,
	Next,
}


/* CLASS */
export default class ReorderList extends HTMLElement {
	private liEls: HTMLLIElement[] = [];
	private ulEl: HTMLUListElement | HTMLOListElement | undefined;
	private grabbedItemEl: HTMLLIElement | null = null;
	private grabbedItemIndex: number | null = null;
	private destinationIndex: number | null = null;
	private cursorStartPos: number | undefined;
	private ulElBottom: number | undefined;
	private ulElTop: number | undefined;
	private grabbedItemElHeight: number | undefined;
	private nextSiblingIndex: number | undefined;
	private prevSiblingIndex: number | undefined;
	private nextSiblingMidpoint: number | undefined;
	private prevSiblingMidpoint: number | undefined;


	// private static useScrollIntoView =
	// 	'scrollBehavior' in document.documentElement.style;

	// private moveDistance: number | undefined;
	// private moveStarted = false;
	// private movingLiEls = false;
	// private previousTouch: Touch | undefined;
	// private selectedLiEl: HTMLLIElement | undefined;
	// private selectedLiElIndex: number | undefined;
	// private selectedLiElIndexDiff: number | undefined;

	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.getLiEls = this.getLiEls.bind(this);
		this.grabItem = this.grabItem.bind(this);
		this.resetGrab = this.resetGrab.bind(this);
		this.getElementsDimensions = this.getElementsDimensions.bind(this);
		this.pointerDownHandler = this.pointerDownHandler.bind(this);
		this.storeNextSibling = this.storeNextSibling.bind(this);
		this.storePrevSibling = this.storePrevSibling.bind(this);
		this.getSiblingData = this.getSiblingData.bind(this);
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this);
		// this.endMove = this.endMove.bind(this);
		// this.mouseDownHandler = this.mouseDownHandler.bind(this);
		// this.setNextSiblingMidpoint = this.setNextSiblingMidpoint.bind(this);
		// this.setPrevSiblingMidpoint = this.setPrevSiblingMidpoint.bind(this);
		// this.translateLiEl = this.translateLiEl.bind(this);
		// this.updateSiblingLiIndexes = this.updateSiblingLiIndexes.bind(this);
		// this.windowMouseMoveHandler = this.windowMouseMoveHandler.bind(this);
	}


	public connectedCallback(): void {
		/* GET DOM ELEMENTS */
		this.ulEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement;
		this.liEls = this.getLiEls();


		/* ADD EVENT LISTENERS */
		this.ulEl.addEventListener('pointerdown', this.pointerDownHandler);
		// this.ulEl.addEventListener('mousedown', this.mouseDownHandler);
		// this.ulEl.addEventListener('touchstart', this.mouseDownHandler);
		// window.addEventListener('mouseup', this.endMove);
		// window.addEventListener('touchend', this.endMove);
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.ulEl?.removeEventListener('pointerdown', this.pointerDownHandler);
		// this.ulEl!.removeEventListener('mousedown', this.mouseDownHandler);
		// this.ulEl!.removeEventListener('touchstart', this.mouseDownHandler);
		// window.removeEventListener('mouseup', this.endMove);
		// window.removeEventListener('touchend', this.endMove);
	}

	private getLiEls(): HTMLLIElement[] {
		return [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];
	}

	private grabItem(element: HTMLLIElement, setGrabbedAttribute = true): void {
		this.grabbedItemEl = element;
		const index = this.liEls.indexOf(element);
		this.grabbedItemIndex = index;
		this.destinationIndex = index;

		if (!setGrabbedAttribute) {
			return;
		}

		this.ulEl!.setAttribute(ATTRS.REORDERING, '');
		this.grabbedItemEl.setAttribute(ATTRS.GRABBED_ITEM, '');
	}

	private resetGrab(): void {
		this.grabbedItemEl?.removeAttribute(ATTRS.GRABBED_ITEM);
		this.grabbedItemEl = null;
		this.grabbedItemIndex = null;
		this.destinationIndex = null;
	}

	private pointerDownHandler(event: Event): void {
		const e = event as PointerEvent;
		if (e.pointerType == 'touch') {
			e.preventDefault();
		}

		const targetEl = e.target as Element;
		const reorderBtnClicked = targetEl.closest(`[${ATTRS.BTN}]`);
		const itemToGrabEl = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		if (!reorderBtnClicked || !itemToGrabEl) {
			return;
		}

		this.cursorStartPos = e.pageY;
		this.grabItem(itemToGrabEl);
		if (!this.grabbedItemIndex && this.grabbedItemIndex != 0) {
			return;
		}

		this.getElementsDimensions();

		this.storePrevSibling(this.grabbedItemIndex);
		this.storeNextSibling(this.grabbedItemIndex);

		window.addEventListener('pointermove', this.pointerMoveHandler);
	}

	private getElementsDimensions(): void {
		const ulRect = this.ulEl!.getBoundingClientRect();
		this.ulElTop = ulRect.top + window.scrollY;
		this.ulElBottom = ulRect.bottom + window.scrollY;

		// We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead
		const selectedLiElStyles = window.getComputedStyle(this.grabbedItemEl!);
		this.grabbedItemElHeight = this.grabbedItemEl!.offsetHeight + parseInt(selectedLiElStyles.marginTop) + parseInt(selectedLiElStyles.marginBottom);
	}

	private storePrevSibling(itemIndex: number): void {
		[this.prevSiblingIndex, this.prevSiblingMidpoint] = this.getSiblingData(itemIndex, Sibling.Prev);
		console.log('this.prevSiblingIndex', this.prevSiblingIndex);
		console.log('this.prevSiblingMidpoint', this.prevSiblingMidpoint);
	}

	private storeNextSibling(itemIndex: number): void {
		[this.nextSiblingIndex, this.nextSiblingMidpoint] = this.getSiblingData(itemIndex, Sibling.Next);
		console.log('this.nextSiblingIndex', this.nextSiblingIndex);
		console.log('this.nextSiblingMidpoint', this.nextSiblingMidpoint);
	}

	private getSiblingData(itemIndex: number, position: Sibling): [number, number] {
		const direction = position == Sibling.Prev ? -1 : 1;
		const siblingIndex = itemIndex + direction;
		const siblingEl = this.liEls[siblingIndex];
		let siblingMidpoint = position == Sibling.Prev ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
		if (siblingEl) {
			const siblingRect = siblingEl.getBoundingClientRect();
			siblingMidpoint = siblingRect.top + window.scrollY + siblingRect.height / 2;
		}
		return [siblingIndex, siblingMidpoint];
	}


	private pointerMoveHandler(event: Event): void {
		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		const e = event as PointerEvent;
		const cursorPos = e.pageY;
		const movementY = e.movementY;
		console.log(cursorPos);
		console.log(movementY);


		// let movementY;
		// let cursorPos;
		// if (e.type == 'mousemove') {
		// } else { //TouchEvent
		// 	const touch = (e as TouchEvent).touches[0];
		// 	cursorPos = touch.pageY;
		// 	movementY = touch.pageY - (this.previousTouch == undefined ? 0 : this.previousTouch.pageY);
		// 	this.previousTouch = touch;
		// }

		if (movementY == 0) {
			return;
		}

		// Anchor element Y position to cursor
		this.grabbedItemEl.style.top = `${cursorPos - (this.cursorStartPos ?? 0)}px`;
	}





	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------


	private endMove(): void {
		// if (!this.moveStarted || !this.ulEl || !this.selectedLiEl || this.selectedLiElIndex == undefined || this.selectedLiElIndexDiff == undefined) {
		// 	return;
		// }

		// const newSelectedLiElIndex = this.selectedLiElIndex + this.selectedLiElIndexDiff;
		// if (this.selectedLiElIndexDiff) {
		// 	const insertBeforeElIndex = this.selectedLiElIndexDiff < 0 ?
		// 		newSelectedLiElIndex :
		// 		newSelectedLiElIndex + 1;
		// 	this.ulEl!.insertBefore(this.selectedLiEl, this.liEls[insertBeforeElIndex]);
		// 	this.liEls.splice(this.selectedLiElIndex, 1);
		// 	this.liEls.splice(newSelectedLiElIndex, 0, this.selectedLiEl);
		// }

		// this.ulEl.removeAttribute(ATTRS.REORDERING);
		// this.liEls.forEach(liEl => liEl.style.transform = '');
		// this.selectedLiEl.removeAttribute(ATTRS.ITEM_GRABBED);
		// this.selectedLiEl.style.top = '';

		// this.moveStarted = false;
		// this.previousTouch = undefined;

		// window.removeEventListener('mousemove', this.windowMouseMoveHandler);
		// window.removeEventListener('touchmove', this.windowMouseMoveHandler);
	}


	private mouseDownHandler(e: Event): void {
		// if (!this.ulEl) {
		// 	return;
		// }

		// const targetEl = e.target as Element;
		// if (!targetEl || !targetEl.closest(`[${ATTRS.BTN}]`)) {
		// 	return;
		// }

		// this.selectedLiEl = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		// if (!this.selectedLiEl) {
		// 	return;
		// }

		// if (e.type == 'touchstart') {
		// 	e.preventDefault();
		// }

		// this.moveStarted = true;
		// this.cursorStartPos = e.type == 'mousedown' ?
		// 	(e as MouseEvent).pageY:
		// 	(e as TouchEvent).touches[0].pageY;

		// const ulRect = this.ulEl.getBoundingClientRect();
		// this.ulElTop = ulRect.top + window.scrollY;
		// this.ulElBottom = ulRect.bottom + window.scrollY;

		// this.ulEl.setAttribute(ATTRS.REORDERING, '');
		// this.selectedLiEl.setAttribute(ATTRS.ITEM_GRABBED, '');

		// this.selectedLiElIndexDiff = 0;
		// this.selectedLiElIndex = this.liEls.indexOf(this.selectedLiEl);

		// this.prevSiblingIndex = this.selectedLiElIndex - 1;
		// this.setPrevSiblingMidpoint(this.prevSiblingIndex);
		// this.nextSiblingIndex = this.selectedLiElIndex + 1;
		// this.setNextSiblingMidpoint(this.nextSiblingIndex);

		// // We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead;
		// const selectedLiElStyles = window.getComputedStyle(this.selectedLiEl);
		// this.moveDistance = this.selectedLiEl.offsetHeight + parseInt(selectedLiElStyles.marginTop) + parseInt(selectedLiElStyles.marginBottom);

		// window.addEventListener('mousemove', this.windowMouseMoveHandler);
		// window.addEventListener('touchmove', this.windowMouseMoveHandler);
	}


	private setNextSiblingMidpoint(liElIndex: number): void {
		// this.nextSiblingMidpoint = Number.POSITIVE_INFINITY;
		// const nextSibling = this.liEls[liElIndex];
		// if (nextSibling) {
		// 	const nextSiblingRect = nextSibling.getBoundingClientRect();
		// 	this.nextSiblingMidpoint = nextSiblingRect.top + window.scrollY + nextSiblingRect.height / 2;
		// }
	}


	private setPrevSiblingMidpoint(liElIndex: number): void {
		// this.prevSiblingMidpoint = Number.NEGATIVE_INFINITY;
		// const prevSibling = this.liEls[liElIndex];
		// if (prevSibling) {
		// 	const prevSiblingRect = prevSibling.getBoundingClientRect();
		// 	this.prevSiblingMidpoint = prevSiblingRect.top + window.scrollY + prevSiblingRect.height / 2;
		// }
	}


	private translateLiEl(index: number, translateVal: number): void {
		// const targetLiEl = this.liEls[index];
		// const currentTransform = targetLiEl.style.transform;
		// targetLiEl.style.transform = currentTransform ?
		// 	'' :
		// 	`translate3d(0px, ${translateVal}px, 0px)`;
	}


	private updateSiblingLiIndexes(direction: -1 | 1): void {
		// if (this.nextSiblingIndex == undefined || this.prevSiblingIndex == undefined) {
		// 	return;
		// }

		// this.nextSiblingIndex += direction;
		// this.prevSiblingIndex += direction;

		// // Choose index of previous li if index is that of grabbedEl
		// if (this.prevSiblingIndex == this.selectedLiElIndex) {
		// 	this.prevSiblingIndex += direction;
		// }
		// if (this.nextSiblingIndex == this.selectedLiElIndex) {
		// 	this.nextSiblingIndex += direction;
		// }
	}


	private windowMouseMoveHandler(e: Event): void {
		// if (
		// 	this.cursorStartPos == undefined ||
		// 	this.moveDistance == undefined ||
		// 	this.nextSiblingIndex == undefined ||
		// 	this.nextSiblingMidpoint == undefined ||
		// 	this.prevSiblingIndex == undefined ||
		// 	this.prevSiblingMidpoint == undefined ||
		// 	this.selectedLiElIndex == undefined ||
		// 	this.selectedLiElIndexDiff == undefined ||
		// 	this.ulElBottom == undefined ||
		// 	this.ulElTop == undefined
		// ) {
		// 	return;
		// }

		if (this.movingLiEls || !this.selectedLiEl) {
			return;
		}

		let movementY;
		let cursorPos;

		if (e.type == 'mousemove') {
			cursorPos = (e as MouseEvent).pageY;
			movementY = (e as MouseEvent).movementY;
		} else { //TouchEvent
			const touch = (e as TouchEvent).touches[0];
			cursorPos = touch.pageY;
			movementY = touch.pageY - (this.previousTouch == undefined ? 0 : this.previousTouch.pageY);
			this.previousTouch = touch;
		}

		if (movementY == 0) {
			return;
		}

		// Anchor element Y position to cursor
		this.selectedLiEl.style.top = `${cursorPos - this.cursorStartPos}px`;
		// Scroll page with grabbed element
		if (
			ReorderList.useScrollIntoView &&
			cursorPos >= this.ulElTop &&
			cursorPos <= this.ulElBottom
		) {
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
