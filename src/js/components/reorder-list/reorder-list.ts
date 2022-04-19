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
	private static useScrollIntoView = 'scrollBehavior' in document.documentElement.style;
	private liEls: HTMLLIElement[] = [];
	private listEl: HTMLUListElement | HTMLOListElement | undefined;
	private grabbedItemEl: HTMLLIElement | null = null;
	private grabbedItemIndex: number | null = null;
	private moveDiff = 0;
	private cursorStartPos: number | undefined;
	private listElTop: number | undefined;
	private listElBottom: number | undefined;
	private grabbedItemElHeight: number | undefined;
	private nextSiblingIndex: number | undefined;
	private prevSiblingIndex: number | undefined;
	private nextSiblingMidpoint: number | undefined;
	private prevSiblingMidpoint: number | undefined;
	private movingLiEls = false;

	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.getLiEls = this.getLiEls.bind(this);
		this.grabItem = this.grabItem.bind(this);
		this.resetMove = this.resetMove.bind(this);
		this.pointerDownHandler = this.pointerDownHandler.bind(this);
		this.getPrevSiblingMidpoint = this.getPrevSiblingMidpoint.bind(this);
		this.getNextSiblingMidpoint = this.getNextSiblingMidpoint.bind(this);
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this);
		this.updateSiblingIndexes = this.updateSiblingIndexes.bind(this);
		this.pointerUpHandler = this.pointerUpHandler.bind(this);
		this.dropGrabbedEl = this.dropGrabbedEl.bind(this);
	}


	public connectedCallback(): void {
		/* GET DOM ELEMENTS */
		this.listEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement | HTMLOListElement;
		this.liEls = this.getLiEls();


		/* ADD EVENT LISTENERS */
		this.listEl.addEventListener('pointerdown', this.pointerDownHandler);
		this.listEl.addEventListener('touchstart', this.touchStartHandler);
		window.addEventListener('pointerup', this.pointerUpHandler);
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.listEl?.removeEventListener('pointerdown', this.pointerDownHandler);
		this.listEl?.removeEventListener('touchstart', this.touchStartHandler);
		window.removeEventListener('pointerup', this.pointerUpHandler);
	}


	/*
		Drop grabbed item at given index
	*/
	private dropGrabbedEl(newIndex: number): void {
		const insertBeforeElIndex = this.moveDiff < 0 ?
			newIndex :
			newIndex + 1;
		this.listEl!.insertBefore(this.grabbedItemEl!, this.liEls[insertBeforeElIndex]);
		this.liEls.splice(this.grabbedItemIndex!, 1);
		this.liEls.splice(newIndex, 0, this.grabbedItemEl!);
	}


	/*
		Get the total height of the grabbed item
	*/
	private getItemHeight(itemEl: HTMLLIElement): number {
		// We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead
		const selectedLiElStyles = window.getComputedStyle(itemEl);
		const topMargin = parseInt(selectedLiElStyles.marginTop);
		const bottomMargin = parseInt(selectedLiElStyles.marginBottom);
		const height = itemEl!.offsetHeight + topMargin + bottomMargin;
		return height;
	}


	/*
		Get the top and bottom Y-coordinates of the listEl
	*/
	private getListBounds(listEl: HTMLUListElement | HTMLOListElement): [number, number] {
		const ulRect = listEl.getBoundingClientRect();
		const top = ulRect.top + window.scrollY;
		const bottom = ulRect.bottom + window.scrollY;
		return [top, bottom];
	}


	/*
		Get all the list items
	*/
	private getLiEls(): HTMLLIElement[] {
		return [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];
	}


	/*
		Get the next sibling midpoint of a sibling at a given index and position (previous or next)
	*/
	private getNextSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.liEls[siblingIndex], Sibling.Next);
	}


	/*
		Get the previous sibling midpoint of a sibling at a given index and position (previous or next)
	*/
	private getPrevSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.liEls[siblingIndex], Sibling.Prev);
	}


	/*
		Get the midpoint of a sibling at a given index and position (previous or next)
	*/
	private getSiblingMidpoint(siblingEl: HTMLLIElement, position: Sibling): number {
		let siblingMidpoint = position == Sibling.Prev ?
			Number.NEGATIVE_INFINITY :
			Number.POSITIVE_INFINITY;

		if (siblingEl) {
			const siblingRect = siblingEl.getBoundingClientRect();
			siblingMidpoint = siblingRect.top + window.scrollY + siblingRect.height / 2;
		}
		return siblingMidpoint;
	}


	/*
		Grab element and optionally add GRABBED_ITEM attribute
	*/
	private grabItem(element: HTMLLIElement, setGrabbedAttribute = true): void {
		this.grabbedItemEl = element;
		const index = this.liEls.indexOf(element);
		this.grabbedItemIndex = index;

		if (!setGrabbedAttribute) {
			return;
		}

		this.listEl!.setAttribute(ATTRS.REORDERING, '');
		this.grabbedItemEl.setAttribute(ATTRS.GRABBED_ITEM, '');
	}


	/*
		Handle pointer down events on list
	*/
	private pointerDownHandler(event: Event): void {
		const targetEl = event.target as Element;
		const reorderBtnClicked = targetEl.closest(`[${ATTRS.BTN}]`);
		if (!reorderBtnClicked) {
			return;
		}

		this.cursorStartPos = (event as PointerEvent).pageY;

		const itemToGrabEl = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		this.grabItem(itemToGrabEl);

		[this.listElTop, this.listElBottom] = this.getListBounds(this.listEl!);
		this.grabbedItemElHeight = this.getItemHeight(this.grabbedItemEl!);

		this.prevSiblingIndex = this.grabbedItemIndex! - 1;
		this.nextSiblingIndex = this.grabbedItemIndex! + 1;
		this.prevSiblingMidpoint = this.getPrevSiblingMidpoint(this.prevSiblingIndex);
		this.nextSiblingMidpoint = this.getNextSiblingMidpoint(this.nextSiblingIndex);

		window.addEventListener('pointermove', this.pointerMoveHandler, { passive: false });
	}


	/*
		Handle pointer move events on window
	*/
	private pointerMoveHandler(event: Event): void {
		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		const e = event as PointerEvent;
		const cursorPos = e.pageY;
		const movementY = e.movementY;

		if (movementY == 0) {
			return;
		}

		// Anchor element Y position to cursor and scroll page with grabbed element
		this.grabbedItemEl.style.top = `${cursorPos - (this.cursorStartPos ?? 0)}px`;
		if (
			ReorderList.useScrollIntoView &&
			cursorPos >= this.listElTop! &&
			cursorPos <= this.listElBottom!
		) {
			this.grabbedItemEl.scrollIntoView({
				behaviour: 'smooth',
				block: 'nearest',
			} as ScrollIntoViewOptions);
		}

		// If cursor crosses previous or next sibling midpoint
		if (cursorPos < this.prevSiblingMidpoint! || cursorPos > this.nextSiblingMidpoint!) {
			this.movingLiEls = true;
			const moveDirection = movementY < 0 ? -1 : 1;
			const translateVal = -(this.grabbedItemElHeight! * moveDirection);
			const movingUp = moveDirection == -1;
			const movingDown = !movingUp;

			while (
				(movingUp && this.prevSiblingIndex! >= 0) ||
				(movingDown && this.nextSiblingIndex! < this.liEls.length)
			){
				if (
					(movingUp && cursorPos >= this.prevSiblingMidpoint!) ||
					(movingDown && cursorPos <= this.nextSiblingMidpoint!)
				){
					break;
				}

				const elToTranslateIndex = movingUp ? this.prevSiblingIndex! : this.nextSiblingIndex!;
				const elToTranslate = this.liEls[elToTranslateIndex];
				this.translateLiEl(elToTranslate, translateVal);
				this.updateSiblingIndexes(moveDirection);

				// Update stored sibling midpoints
				if (movingUp) {
					// Can't use getNextSiblingMidpoint() because new sibling will transition
					this.nextSiblingMidpoint = this.prevSiblingMidpoint! + this.grabbedItemElHeight!;
					this.prevSiblingMidpoint = this.getPrevSiblingMidpoint(this.prevSiblingIndex!);
				} else {
					// Can't use getPrevSiblingMidpoint() because new sibling will transition
					this.prevSiblingMidpoint = this.nextSiblingMidpoint! - this.grabbedItemElHeight!;
					this.nextSiblingMidpoint = this.getNextSiblingMidpoint(this.nextSiblingIndex!);
				}
				this.moveDiff += moveDirection;
			}

			this.movingLiEls = false;
		}
	}


	/*
		Handle pointer up events on list
	*/
	private pointerUpHandler(): void {
		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		if (this.moveDiff) {
			const grabbedItemNewIndex = this.grabbedItemIndex + this.moveDiff;
			this.dropGrabbedEl(grabbedItemNewIndex);
		}

		this.listEl!.removeAttribute(ATTRS.REORDERING);
		this.grabbedItemEl?.removeAttribute(ATTRS.GRABBED_ITEM);
		this.liEls.forEach(liEl => liEl.style.transform = '');
		this.grabbedItemEl.style.top = '';

		this.resetMove();
		window.removeEventListener('pointermove', this.pointerMoveHandler);
	}


	/*
		Reset grabbed item state and remove GRABBED_ITEM attribute
	*/
	private resetMove(): void {
		this.grabbedItemEl = null;
		this.grabbedItemIndex = null;
		this.moveDiff = 0;
	}


	/*
	  Prevent page scrolling while dragging item
	*/
	private touchStartHandler(e: Event): void {
		const reorderBtnClicked = (e.target as Element).closest(`[${ATTRS.BTN}]`);
		if (reorderBtnClicked) {
			e.preventDefault();
		}
	}


	/*
		Translate the li at a given index by a given number of pixels
	*/
	private translateLiEl(liEl: HTMLLIElement, translateVal: number): void {
		const currentTransform = liEl.style.transform;
		liEl.style.transform = currentTransform ?
			'' :
			`translate3d(0px, ${translateVal}px, 0px)`;
	}


	/*
		Update the sibling indexes based on a given direction or movement
	*/
	private updateSiblingIndexes(moveDirection: -1 | 1): void {
		if (this.nextSiblingIndex == undefined || this.prevSiblingIndex == undefined) {
			return;
		}

		this.prevSiblingIndex += moveDirection;
		this.nextSiblingIndex += moveDirection;

		// Choose index of previous li if index is that of grabbedEl
		if (this.prevSiblingIndex == this.grabbedItemIndex) {
			this.prevSiblingIndex += moveDirection;
		}

		// Choose index of next li if index is that of grabbedEl
		if (this.nextSiblingIndex == this.grabbedItemIndex) {
			this.nextSiblingIndex += moveDirection;
		}
	}

	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------
	// -----------------------------------------------------------------




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
				this.updateSiblingIndexes(moveDirection);

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
