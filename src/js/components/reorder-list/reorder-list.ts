const useScrollIntoView = (): boolean => 'scrollBehavior' in document.documentElement.style;


/* COMPONENT NAME */
export const REORDER_LIST = `ace-reorder-list`;


/* CONSTANTS */
export const ATTRS = {
	BTN: `${REORDER_LIST}-item-btn`,
	GRABBED_ITEM: `${REORDER_LIST}-grabbed-item`,
	HIGHLIGHTED_ITEM: `${REORDER_LIST}-highlighted-item`,
	ITEM: `${REORDER_LIST}-item`,
	LIST: `${REORDER_LIST}-list`,
	REORDERING: `${REORDER_LIST}-reordering`,
};



/* CLASS */
export default class ReorderList extends HTMLElement {
	private cursorStartPos: number | undefined;
	private grabbedItemEl: HTMLLIElement | null = null;
	private grabbedItemElHeight: number | undefined;
	private grabbedItemIndex: number | null = null;
	private grabbedItemIndexChange = 0;
	private highlightedItemIndex: number | null = null;
	private liEls: HTMLLIElement[] = [];
	private listEl: HTMLUListElement | HTMLOListElement | undefined;
	private listElBottom: number | undefined;
	private listElTop: number | undefined;
	private movingLiEls = false;
	private nextSiblingIndex: number | undefined;
	private nextSiblingMidpoint: number | undefined;
	private prevSiblingIndex: number | undefined;
	private prevSiblingMidpoint: number | undefined;

	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.focusOutHandler = this.focusOutHandler.bind(this);
		this.dropGrabbedEl = this.dropGrabbedEl.bind(this);
		this.getNextSiblingMidpoint = this.getNextSiblingMidpoint.bind(this);
		this.getPrevSiblingMidpoint = this.getPrevSiblingMidpoint.bind(this);
		this.grabItem = this.grabItem.bind(this);
		this.keyDownHandler = this.keyDownHandler.bind(this);
		this.pointerDownHandler = this.pointerDownHandler.bind(this);
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this);
		this.pointerUpHandler = this.pointerUpHandler.bind(this);
		this.resetMove = this.resetMove.bind(this);
		this.updateSiblingIndexes = this.updateSiblingIndexes.bind(this);
	}


	public connectedCallback(): void {
		/* GET DOM ELEMENTS */
		this.listEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement | HTMLOListElement;
		this.liEls = [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];


		/* ADD EVENT LISTENERS */
		this.listEl.addEventListener('focusout', this.focusOutHandler);
		this.listEl.addEventListener('focusout', this.focusOutHandler);
		this.listEl.addEventListener('keydown', this.keyDownHandler);
		this.listEl.addEventListener('pointerdown', this.pointerDownHandler);
		this.listEl.addEventListener('touchstart', this.touchStartHandler);
		window.addEventListener('pointerup', this.pointerUpHandler);
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.listEl?.addEventListener('focusout', this.focusOutHandler);
		this.listEl?.removeEventListener('keydown', this.keyDownHandler);
		this.listEl?.removeEventListener('pointerdown', this.pointerDownHandler);
		this.listEl?.removeEventListener('touchstart', this.touchStartHandler);
		window.removeEventListener('pointerup', this.pointerUpHandler);
	}


	/*
		Drop grabbed item at new index based on this.grabbedItemIndexChange
	*/
	private dropGrabbedEl(): void {
		if (!this.grabbedItemIndexChange) {
			return;
		}

		const newIndex = this.grabbedItemIndex! + this.grabbedItemIndexChange;
		const insertBeforeElIndex = this.grabbedItemIndexChange < 0 ?
			newIndex :
			newIndex + 1;
		this.listEl!.insertBefore(this.grabbedItemEl!, this.liEls[insertBeforeElIndex]);
		this.liEls.splice(this.grabbedItemIndex!, 1);
		this.liEls.splice(newIndex, 0, this.grabbedItemEl!);
		this.resetMove();
	}


	/*
		Handle focusout event on list
	*/
	private focusOutHandler(e: Event): void {
		const targetBtn = (e.target as Element).closest(`[${ATTRS.BTN}]`);
		if (!targetBtn) {
			return;
		}

		this.resetMove();
	}


	/*
		Get the total height of the grabbed item including vertical margins
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
		Get the top and bottom position of listEl
	*/
	private getListBounds(listEl: HTMLUListElement | HTMLOListElement): [number, number] {
		const ulRect = listEl.getBoundingClientRect();
		const top = ulRect.top + window.scrollY;
		const bottom = ulRect.bottom + window.scrollY;
		return [top, bottom];
	}


	/*
		Get midpoint of sibling at given index. Returns Number.POSITIVE_INFINITY if there's no item at given index.
	*/
	private getNextSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.liEls[siblingIndex], true);
	}


	/*
		Get midpoint of sibling at given index. Returns Number.NEGATIVE_INFINITY if there's no item at given index.
	*/
	private getPrevSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.liEls[siblingIndex]);
	}


	/*
		Get the midpoint of a given sibling element based on it's position (previous or next)
	*/
	private getSiblingMidpoint(siblingEl: HTMLLIElement, isNextSibling = true): number {
		let siblingMidpoint = isNextSibling ?	Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		if (siblingEl) {
			const siblingRect = siblingEl.getBoundingClientRect();
			siblingMidpoint = siblingRect.top + window.scrollY + siblingRect.height / 2;
		}
		return siblingMidpoint;
	}


	/*
		Grab element and optionally add grabbed styles
	*/
	private grabItem(element: HTMLLIElement, setGrabbedStyles = true): void {
		this.grabbedItemEl = element;
		const index = this.liEls.indexOf(element);
		this.grabbedItemIndex = index;

		if (!setGrabbedStyles) {
			return;
		}

		this.listEl!.setAttribute(ATTRS.REORDERING, '');
		this.grabbedItemEl.setAttribute(ATTRS.GRABBED_ITEM, '');
	}


	/*
		Handle keydown events on listEl
	*/
	private keyDownHandler(e: Event): void {
		const target = e.target as HTMLElement;
		const itemElSelected = target.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		if (!itemElSelected) {
			return;
		}
		const btnSelected = target.closest(`[${ATTRS.BTN}]`);
		const keyPressed = (e as KeyboardEvent).key;
		switch(keyPressed) {
			case 'Enter':
				if (!this.grabbedItemEl && btnSelected) {
					e.preventDefault();
					this.grabItem(itemElSelected);
					this.highlightedItemIndex = this.grabbedItemIndex;
				} else if (this.grabbedItemEl) {
					e.preventDefault();
					this.liEls[this.highlightedItemIndex!]?.removeAttribute(ATTRS.HIGHLIGHTED_ITEM);
					this.grabbedItemIndexChange = this.highlightedItemIndex! - this.grabbedItemIndex!;
					this.dropGrabbedEl();
					const itemElSelectedBtn = itemElSelected.querySelector(`[${ATTRS.BTN}]`) as HTMLButtonElement;
					itemElSelectedBtn?.focus();
					this.resetMove();
				}
				break;
			case 'Escape':
				if (!this.grabbedItemEl) {
					return;
				}
				this.resetMove();
				break;
			case 'ArrowUp':
			case 'ArrowDown':
			case 'Home':
			case 'End': {
				if (!this.grabbedItemEl || (!this.highlightedItemIndex && this.highlightedItemIndex !== 0)) {
					return;
				}

				e.preventDefault();
				const lastLiElIndex = this.liEls.length - 1;

				if (keyPressed.includes('Arrow')) {
					const moveDirection = keyPressed == 'ArrowUp' ? -1 : 1;
					this.liEls[this.highlightedItemIndex].removeAttribute(ATTRS.HIGHLIGHTED_ITEM);
					this.highlightedItemIndex += moveDirection;
					if (this.highlightedItemIndex == this.grabbedItemIndex) {
						this.highlightedItemIndex += moveDirection;
					}

					if (this.highlightedItemIndex < 0) {
						this.highlightedItemIndex = lastLiElIndex;
					} else if (this.highlightedItemIndex > lastLiElIndex) {
						this.highlightedItemIndex = 0;
					}

					if (this.highlightedItemIndex == this.grabbedItemIndex) {
						this.highlightedItemIndex += moveDirection;
					}
				} else {
					this.highlightedItemIndex = keyPressed == 'Home' ? 0 : lastLiElIndex;
				}

				const highlightedItemEl = this.liEls[this.highlightedItemIndex];
				if (!highlightedItemEl) {
					return;
				}
				highlightedItemEl.setAttribute(ATTRS.HIGHLIGHTED_ITEM, '');
				if (useScrollIntoView()) {
					highlightedItemEl.scrollIntoView({
						behaviour: 'smooth',
						block: 'nearest',
					} as ScrollIntoViewOptions);
				}
				break;
			}
		}
	}


	/*
		Handle pointerdown events on list
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
		Handle pointermove events on window
	*/
	private pointerMoveHandler(event: Event): void {
		if (this.movingLiEls) {
			return;
		}

		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		const e = event as PointerEvent;
		const movementY = e.movementY;
		if (movementY == 0) {
			return;
		}

		const cursorPos = e.pageY;

		// Anchor element Y position to cursor and scroll page with grabbed element
		this.grabbedItemEl.style.top = `${cursorPos - (this.cursorStartPos ?? 0)}px`;
		if (
			useScrollIntoView() &&
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
				this.grabbedItemIndexChange += moveDirection;
			}

			this.movingLiEls = false;
		}
	}


	/*
		Handle pointerup events on window
	*/
	private pointerUpHandler(): void {
		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		// Remove translations
		this.listEl!.removeAttribute(ATTRS.REORDERING);
		this.liEls.forEach(liEl => liEl.style.transform = '');
		this.grabbedItemEl.style.top = '';

		this.dropGrabbedEl();
		window.removeEventListener('pointermove', this.pointerMoveHandler);
	}


	/*
		Reset grabbed item state
	*/
	private resetMove(): void {
		this.grabbedItemEl?.removeAttribute(ATTRS.GRABBED_ITEM);
		this.grabbedItemEl = null;
		this.grabbedItemIndex = null;
		this.grabbedItemIndexChange = 0;

		this.liEls[this.highlightedItemIndex!]?.removeAttribute(ATTRS.HIGHLIGHTED_ITEM);
		this.highlightedItemIndex = null;
	}


	/*
	  Prevent page scrolling while dragging item on touchscreens
	*/
	private touchStartHandler(e: Event): void {
		const reorderBtnClicked = (e.target as Element).closest(`[${ATTRS.BTN}]`);
		if (reorderBtnClicked) {
			e.preventDefault();
		}
	}


	/*
		Translate given liEl in Y-axis by a given value
	*/
	private translateLiEl(liEl: HTMLLIElement, translateVal: number): void {
		const currentTransform = liEl.style.transform;
		liEl.style.transform = currentTransform ?
			'' :
			`translate3d(0px, ${translateVal}px, 0px)`;
	}


	/*
		Update sibling indexes based on a given direction of movement
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
}



/* REGISTER CUSTOM ELEMENT */
document.addEventListener('DOMContentLoaded', () => {
	customElements.define(REORDER_LIST, ReorderList);
});
