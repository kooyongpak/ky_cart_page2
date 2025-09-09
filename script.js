// 6. 초기 더미 데이터 (예시)
const initialDummyData = [
    {
        id: "item1",
        name: "프리미엄 무선 이어폰",
        price: 120000,
        quantity: 1,
        imageUrl: "https://picsum.photos/id/10/80/80",
        isSelected: true,
    },
    {
        id: "item2",
        name: "고속 충전 보조배터리",
        price: 35000,
        quantity: 2,
        imageUrl: "https://picsum.photos/id/19/80/80",
        isSelected: false,
    },
    {
        id: "item3",
        name: "인체공학 무선 마우스",
        price: 25000,
        quantity: 1,
        imageUrl: "https://picsum.photos/id/20/80/80",
        isSelected: true,
    },
];

// 3.1. CartStore 모듈 (데이터 관리)
const CartStore = (() => {
    const STORAGE_KEY = 'cartItems';

    const saveCartItems = (items) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    const getCartItems = () => {
        const items = localStorage.getItem(STORAGE_KEY);
        return items ? JSON.parse(items) : [];
    };

    const initCartData = () => {
        let items = getCartItems();
        if (items.length === 0) {
            items = initialDummyData;
            saveCartItems(items);
        }
        return items;
    };

    const updateItemQuantity = (itemId, quantity) => {
        let items = getCartItems();
        items = items.map(item =>
            item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
        );
        saveCartItems(items);
        return items;
    };

    const updateItemSelection = (itemId, isSelected) => {
        let items = getCartItems();
        items = items.map(item =>
            item.id === itemId ? { ...item, isSelected: isSelected } : item
        );
        saveCartItems(items);
        return items;
    };

    const updateAllItemSelection = (isSelected) => {
        let items = getCartItems();
        items = items.map(item => ({ ...item, isSelected: isSelected }));
        saveCartItems(items);
        return items;
    };

    const deleteSelectedItems = () => {
        let items = getCartItems();
        items = items.filter(item => !item.isSelected);
        saveCartItems(items);
        return items;
    };

    return {
        initCartData,
        getCartItems,
        saveCartItems,
        updateItemQuantity,
        updateItemSelection,
        updateAllItemSelection,
        deleteSelectedItems
    };
})();

// 3.2. CartCalculator 모듈 (비즈니스 로직)
const CartCalculator = (() => {
    const SHIPPING_FEE_THRESHOLD = 50000;
    const DEFAULT_SHIPPING_FEE = 3000;

    const calculateSelectedItemsTotal = (items) => {
        return items.reduce((total, item) => {
            return item.isSelected ? total + (item.price * item.quantity) : total;
        }, 0);
    };

    const calculateShippingFee = (totalAmount) => {
        return totalAmount < SHIPPING_FEE_THRESHOLD && totalAmount > 0 ? DEFAULT_SHIPPING_FEE : 0;
    };

    const calculateTotalPayment = (selectedItemsTotal, shippingFee) => {
        return selectedItemsTotal + shippingFee;
    };

    return {
        calculateSelectedItemsTotal,
        calculateShippingFee,
        calculateTotalPayment
    };
})();

// 3.3. CartRenderer 모듈 (UI 렌더링)
const CartRenderer = (() => {
    const cartItemsContainer = document.getElementById('cartItems');
    const selectedItemsTotalElement = document.getElementById('selectedItemsTotal');
    const shippingFeeElement = document.getElementById('shippingFee');
    const totalPaymentElement = document.getElementById('totalPayment');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const deleteSelectedBtn = document.querySelector('.delete-selected-btn');

    const formatCurrency = (amount) => {
        return amount.toLocaleString('ko-KR') + '원';
    };

    const renderCartItems = (items) => {
        cartItemsContainer.innerHTML = ''; // 기존 목록 초기화
        if (items.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 20px;">장바구니가 비어 있습니다.</p>';
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.setAttribute('data-id', item.id);
            itemElement.innerHTML = `
                <input type="checkbox" class="item-checkbox" ${item.isSelected ? 'checked' : ''} data-id="${item.id}">
                <img src="${item.imageUrl}" alt="${item.name}" class="item-image">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="price">${formatCurrency(item.price)}</p>
                </div>
                <div class="quantity-control">
                    <button class="decrease-quantity" data-id="${item.id}">-</button>
                    <input type="number" class="item-quantity" value="${item.quantity}" min="1" data-id="${item.id}">
                    <button class="increase-quantity" data-id="${item.id}">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    };

    const renderSummary = (summaryData) => {
        selectedItemsTotalElement.textContent = formatCurrency(summaryData.selectedItemsTotal);
        shippingFeeElement.textContent = formatCurrency(summaryData.shippingFee);
        totalPaymentElement.textContent = formatCurrency(summaryData.totalPayment);
    };

    const renderAllSelectCheckbox = (isAllSelected) => {
        selectAllCheckbox.checked = isAllSelected;
    };

    // 이벤트 리스너는 App 모듈에서 통합 관리
    // addEventListeners 함수는 App 모듈에서 호출될 것
    const addEventListeners = (callbacks) => {
        // 전체 선택/해제
        selectAllCheckbox.addEventListener('change', (e) => {
            callbacks.onAllSelectionChange(e.target.checked);
        });

        // 개별 상품 선택/해제 및 수량 조절은 이벤트 위임을 통해 처리
        cartItemsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-checkbox')) {
                const itemId = e.target.dataset.id;
                callbacks.onItemSelectionChange(itemId, e.target.checked);
            } else if (e.target.classList.contains('item-quantity')) {
                const itemId = e.target.dataset.id;
                const quantity = parseInt(e.target.value);
                if (!isNaN(quantity) && quantity >= 1) {
                    callbacks.onQuantityChange(itemId, quantity);
                } else {
                    // 유효하지 않은 값 입력 시, 이전 값으로 복원
                    const currentItems = CartStore.getCartItems();
                    const currentItem = currentItems.find(item => item.id === itemId);
                    e.target.value = currentItem ? currentItem.quantity : 1;
                }
            }
        });

        cartItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('decrease-quantity')) {
                const itemId = e.target.dataset.id;
                const quantityInput = e.target.nextElementSibling;
                let quantity = parseInt(quantityInput.value);
                if (quantity > 1) {
                    quantity--;
                    callbacks.onQuantityChange(itemId, quantity);
                }
            } else if (e.target.classList.contains('increase-quantity')) {
                const itemId = e.target.dataset.id;
                const quantityInput = e.target.previousElementSibling;
                let quantity = parseInt(quantityInput.value);
                quantity++;
                callbacks.onQuantityChange(itemId, quantity);
            }
        });

        // 선택 상품 삭제 버튼
        deleteSelectedBtn.addEventListener('click', callbacks.onDeleteSelectedItems);

        // 주문하기 버튼 (기능은 추가하지 않음)
        document.querySelector('.order-btn').addEventListener('click', () => {
            alert('주문하기 기능은 구현되지 않았습니다.');
        });
    };

    return {
        renderCartItems,
        renderSummary,
        renderAllSelectCheckbox,
        addEventListeners
    };
})();

// 3.4. App 모듈 (최상위 컨트롤러)
const App = (() => {
    let cartItems = []; // 현재 장바구니 상태

    const updateCartUI = () => {
        const selectedItemsTotal = CartCalculator.calculateSelectedItemsTotal(cartItems);
        const shippingFee = CartCalculator.calculateShippingFee(selectedItemsTotal);
        const totalPayment = CartCalculator.calculateTotalPayment(selectedItemsTotal, shippingFee);

        CartRenderer.renderCartItems(cartItems);
        CartRenderer.renderSummary({ selectedItemsTotal, shippingFee, totalPayment });

        // 모든 상품이 선택되었는지 확인하여 '전체 선택' 체크박스 상태 업데이트
        const allSelected = cartItems.length > 0 && cartItems.every(item => item.isSelected);
        CartRenderer.renderAllSelectCheckbox(allSelected);
    };

    const handleItemSelection = (itemId, isSelected) => {
        cartItems = CartStore.updateItemSelection(itemId, isSelected);
        updateCartUI();
    };

    const handleAllSelection = (isSelected) => {
        cartItems = CartStore.updateAllItemSelection(isSelected);
        updateCartUI();
    };

    const handleQuantityChange = (itemId, quantity) => {
        cartItems = CartStore.updateItemQuantity(itemId, quantity);
        updateCartUI();
    };

    const handleDeleteSelectedItems = () => {
        if (confirm('선택된 상품들을 장바구니에서 삭제하시겠습니까?')) {
            cartItems = CartStore.deleteSelectedItems();
            updateCartUI();
        }
    };

    const init = () => {
        cartItems = CartStore.initCartData(); // 로컬 스토리지 데이터 로드 또는 초기 더미 데이터 설정
        updateCartUI();

        CartRenderer.addEventListeners({
            onItemSelectionChange: handleItemSelection,
            onAllSelectionChange: handleAllSelection,
            onQuantityChange: handleQuantityChange,
            onDeleteSelectedItems: handleDeleteSelectedItems,
        });
    };

    return {
        init
    };
})();

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', App.init);