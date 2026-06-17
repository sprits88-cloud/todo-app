// Supabase 클라이언트 초기화
const supabaseUrl = 'https://dndqwpbpksdpntsdudla.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZHF3cGJwa3NkcG50c2R1ZGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzMxNTgsImV4cCI6MjA5NzI0OTE1OH0.IYuaJHwYIbo4m80GdisdQJKP_nyc--BFChI9sIjvaZo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// 전역 변수
let currentDate = new Date();
let selectedDate = new Date();
let todos = [];
let userInfo = null;
let currentUser = null;
let currentProfileId = null;
let draggedElement = null;
let draggedTodoId = null;

// DOM 요소 - Auth
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const emailVerificationMessage = document.getElementById('emailVerificationMessage');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const backToLoginBtn = document.getElementById('backToLoginBtn');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');

const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupPasswordConfirm = document.getElementById('signupPasswordConfirm');
const signupBtn = document.getElementById('signupBtn');

const logoutBtn = document.getElementById('logoutBtn');
const userMenuDisplay = document.getElementById('userMenuDisplay');
const headerUserEmail = document.getElementById('headerUserEmail');

// DOM 요소 - User
const userNameInput = document.getElementById('userNameInput');
const saveUserBtn = document.getElementById('saveUserBtn');
const editUserBtn = document.getElementById('editUserBtn');
const userDisplay = document.getElementById('userDisplay');
const userForm = document.getElementById('userForm');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// DOM 요소 - Calendar & Todo
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthEl = document.getElementById('currentMonth');
const calendarEl = document.getElementById('calendar');
const selectedDateEl = document.getElementById('selectedDate');

const todoInput = document.getElementById('todoInput');
const prioritySelect = document.getElementById('prioritySelect');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoListHigh = document.getElementById('todoListHigh');
const todoListMedium = document.getElementById('todoListMedium');
const todoListLow = document.getElementById('todoListLow');
const emptyMessage = document.getElementById('emptyMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

// 로딩 표시 함수
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// 초기화
async function init() {
    console.log('Initializing app...');
    console.log('Supabase client:', typeof supabase !== 'undefined' ? 'OK' : 'MISSING');

    showLoading();
    try {
        await checkAuth();
        attachEventListeners();
        setupAuthEventListeners();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        alert('초기화 중 오류가 발생했습니다: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 인증 상태 확인
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        currentUser = session.user;
        await onUserAuthenticated();
    } else {
        showAuthModal();
    }
}

// 사용자 인증 후 처리
async function onUserAuthenticated() {
    hideAuthModal();
    showUserMenu();
    await loadUserInfo();
    await loadTodos();
    renderCalendar();
    updateSelectedDate();
    renderTodos();
    setupDragAndDrop();
    setupRealtimeSubscription();
}

// Auth 이벤트 리스너
function setupAuthEventListeners() {
    console.log('Setting up auth event listeners...');
    console.log('signupBtn:', signupBtn);

    // 로그인/회원가입 전환
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupFormView();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginFormView();
    });

    backToLoginBtn.addEventListener('click', () => {
        showLoginFormView();
    });

    // 모달 닫기
    closeModalBtn.addEventListener('click', () => {
        // 로그인하지 않은 상태에서는 모달을 닫을 수 없음
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        hideAuthModal();
    });

    // 로그인
    loginBtn.addEventListener('click', handleLogin);
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 회원가입
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            console.log('Signup button clicked', e);
            handleSignup();
        });
        console.log('Signup button listener attached');
    } else {
        console.error('signupBtn not found!');
    }

    signupPasswordConfirm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });

    // 로그아웃
    logoutBtn.addEventListener('click', handleLogout);

    // Supabase auth state 변화 감지
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);

        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            onUserAuthenticated();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentProfileId = null;
            todos = [];
            showAuthModal();
            hideUserMenu();
        }
    });
}

// 로그인 처리
async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }

    showLoading();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                alert('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else if (error.message.includes('Email not confirmed')) {
                alert('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.');
            } else {
                alert('로그인 중 오류가 발생했습니다: ' + error.message);
            }
            return;
        }

        // 성공 시 onAuthStateChange에서 처리됨
        loginEmail.value = '';
        loginPassword.value = '';
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 회원가입 처리
async function handleSignup() {
    console.log('handleSignup called');

    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const passwordConfirm = signupPasswordConfirm.value.trim();

    console.log('Signup form values:', { name, email, passwordLength: password.length });

    if (!name || !email || !password || !passwordConfirm) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (password.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    showLoading();
    try {
        console.log('Calling supabase.auth.signUp...');

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });

        console.log('Signup response:', { data, error });

        if (error) {
            console.error('Signup error:', error);
            if (error.message.includes('already registered')) {
                alert('이미 가입된 이메일입니다.');
            } else {
                alert('회원가입 중 오류가 발생했습니다: ' + error.message);
            }
            return;
        }

        console.log('Signup successful, showing verification view');

        // 이메일 확인 메시지 표시
        showEmailVerificationView();

        // 폼 초기화
        signupName.value = '';
        signupEmail.value = '';
        signupPassword.value = '';
        signupPasswordConfirm.value = '';
    } catch (error) {
        console.error('Signup exception:', error);
        alert('회원가입 중 오류가 발생했습니다: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 로그아웃 처리
async function handleLogout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;

    showLoading();
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
            return;
        }
        // onAuthStateChange에서 처리됨
    } catch (error) {
        console.error('Logout error:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 모달 표시 관련 함수
function showAuthModal() {
    authModal.classList.remove('hidden');
    showLoginFormView();
}

function hideAuthModal() {
    authModal.classList.add('hidden');
}

function showLoginFormView() {
    modalTitle.textContent = '로그인';
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    emailVerificationMessage.classList.add('hidden');
}

function showSignupFormView() {
    modalTitle.textContent = '회원가입';
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    emailVerificationMessage.classList.add('hidden');
}

function showEmailVerificationView() {
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    emailVerificationMessage.classList.remove('hidden');
}

function showUserMenu() {
    userMenuDisplay.classList.remove('hidden');
    headerUserEmail.textContent = currentUser.email;
}

function hideUserMenu() {
    userMenuDisplay.classList.add('hidden');
}

// 이벤트 리스너
function attachEventListeners() {
    saveUserBtn.addEventListener('click', saveUserInfo);
    editUserBtn.addEventListener('click', editUserInfo);

    prevMonthBtn.addEventListener('click', prevMonth);
    nextMonthBtn.addEventListener('click', nextMonth);

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
}

// 사용자 정보 관리
async function loadUserInfo() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = 결과 없음
            console.error('Load profile error:', error);
            return;
        }

        if (profiles) {
            userInfo = profiles;
            currentProfileId = profiles.id;
            displayUserInfo();
        } else {
            // 프로필이 없으면 자동 생성
            await createInitialProfile();
        }
    } catch (error) {
        console.error('Load user info error:', error);
    }
}

async function createInitialProfile() {
    showLoading();
    try {
        const name = currentUser.user_metadata?.name || currentUser.email.split('@')[0];

        const profileData = {
            auth_user_id: currentUser.id,
            name: name,
            email: currentUser.email
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();

        if (error) {
            console.error('Create profile error:', error);
            return;
        }

        userInfo = data;
        currentProfileId = data.id;
        displayUserInfo();
    } catch (error) {
        console.error('Create initial profile error:', error);
    } finally {
        hideLoading();
    }
}

async function saveUserInfo() {
    const name = userNameInput.value.trim();

    if (!name) {
        alert('이름을 입력해주세요.');
        return;
    }

    showLoading();
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ name: name })
            .eq('id', currentProfileId)
            .select()
            .single();

        if (error) {
            console.error('Save profile error:', error);
            alert('저장 중 오류가 발생했습니다.');
            return;
        }

        userInfo = data;
        displayUserInfo();
    } catch (error) {
        console.error('Save user info error:', error);
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

function displayUserInfo() {
    userName.textContent = userInfo.name;
    userEmail.textContent = userInfo.email;
    userDisplay.classList.remove('hidden');
    userForm.classList.add('hidden');
}

function editUserInfo() {
    userNameInput.value = userInfo.name;
    userDisplay.classList.add('hidden');
    userForm.classList.remove('hidden');
}

// 달력 관리
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 현재 월 표시
    currentMonthEl.textContent = `${year}년 ${month + 1}월`;

    // 달력 초기화
    calendarEl.innerHTML = '';

    // 요일 헤더
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    weekDays.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day header';
        dayEl.textContent = day;
        calendarEl.appendChild(dayEl);
    });

    // 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    // 이전 달 날짜
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const dayEl = createDayElement(prevLastDate - i, month - 1, year, true);
        calendarEl.appendChild(dayEl);
    }

    // 현재 달 날짜
    for (let day = 1; day <= lastDate; day++) {
        const dayEl = createDayElement(day, month, year, false);
        calendarEl.appendChild(dayEl);
    }

    // 다음 달 날짜
    const remainingDays = 42 - (firstDayOfWeek + lastDate);
    for (let day = 1; day <= remainingDays; day++) {
        const dayEl = createDayElement(day, month + 1, year, true);
        calendarEl.appendChild(dayEl);
    }
}

function createDayElement(day, month, year, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;

    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }

    const dateStr = formatDate(new Date(year, month, day));

    // 선택된 날짜 표시
    if (dateStr === formatDate(selectedDate)) {
        dayEl.classList.add('selected');
    }

    // 할일이 있는 날짜 표시
    if (todos.some(todo => todo.date === dateStr)) {
        dayEl.classList.add('has-todos');
    }

    dayEl.addEventListener('click', () => {
        selectedDate = new Date(year, month, day);
        renderCalendar();
        updateSelectedDate();
        renderTodos();
    });

    return dayEl;
}

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function updateSelectedDate() {
    selectedDateEl.textContent = formatDateKorean(selectedDate);
}

// Todo 관리
async function loadTodos() {
    if (!currentProfileId) return;

    try {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', currentProfileId)
            .order('date', { ascending: true })
            .order('priority', { ascending: true })
            .order('order', { ascending: true });

        if (error) {
            console.error('Load todos error:', error);
            return;
        }

        todos = data || [];
    } catch (error) {
        console.error('Load todos error:', error);
    }
}

async function addTodo() {
    const text = todoInput.value.trim();
    const priority = prioritySelect.value;

    if (!text) {
        alert('할 일을 입력해주세요.');
        return;
    }

    if (!currentProfileId) {
        alert('먼저 사용자 정보를 입력해주세요.');
        return;
    }

    showLoading();
    try {
        const dateStr = formatDate(selectedDate);
        const sameDateTodos = todos.filter(t => t.date === dateStr && t.priority === priority);
        const maxOrder = sameDateTodos.length > 0 ? Math.max(...sameDateTodos.map(t => t.order)) : -1;

        const { data, error } = await supabase
            .from('todos')
            .insert({
                user_id: currentProfileId,
                text: text,
                completed: false,
                date: dateStr,
                priority: priority,
                order: maxOrder + 1
            })
            .select()
            .single();

        if (error) {
            console.error('Add todo error:', error);
            alert('할 일 추가 중 오류가 발생했습니다.');
            return;
        }

        todos.push(data);
        renderCalendar();
        renderTodos();

        todoInput.value = '';
        todoInput.focus();
    } catch (error) {
        console.error('Add todo error:', error);
        alert('할 일 추가 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('todos')
            .update({ completed: !todo.completed })
            .eq('id', id);

        if (error) {
            console.error('Toggle todo error:', error);
            alert('업데이트 중 오류가 발생했습니다.');
            return;
        }

        todo.completed = !todo.completed;
        renderTodos();
    } catch (error) {
        console.error('Toggle todo error:', error);
        alert('업데이트 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

async function deleteTodo(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete todo error:', error);
            alert('삭제 중 오류가 발생했습니다.');
            return;
        }

        todos = todos.filter(t => t.id !== id);
        renderCalendar();
        renderTodos();
    } catch (error) {
        console.error('Delete todo error:', error);
        alert('삭제 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

function renderTodos() {
    const dateStr = formatDate(selectedDate);
    const dateTodos = todos.filter(t => t.date === dateStr);

    // 각 우선순위별 컨테이너 초기화
    todoListHigh.innerHTML = '';
    todoListMedium.innerHTML = '';
    todoListLow.innerHTML = '';

    if (dateTodos.length === 0) {
        emptyMessage.classList.remove('hidden');
    } else {
        emptyMessage.classList.add('hidden');

        // 우선순위별로 그룹화하고 order로 정렬
        const priorityGroups = {
            high: dateTodos.filter(t => t.priority === 'high').sort((a, b) => a.order - b.order),
            medium: dateTodos.filter(t => t.priority === 'medium').sort((a, b) => a.order - b.order),
            low: dateTodos.filter(t => t.priority === 'low').sort((a, b) => a.order - b.order)
        };

        // 각 우선순위별로 렌더링
        renderPriorityGroup(priorityGroups.high, todoListHigh);
        renderPriorityGroup(priorityGroups.medium, todoListMedium);
        renderPriorityGroup(priorityGroups.low, todoListLow);
    }
}

function renderPriorityGroup(todoList, container) {
    todoList.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('draggable', 'true');
        li.setAttribute('data-todo-id', todo.id);

        li.innerHTML = `
            <span class="drag-handle material-icons">drag_indicator</span>
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="btn-delete">삭제</button>
        `;

        const checkbox = li.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => toggleTodo(todo.id));

        const deleteBtn = li.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        // 드래그 이벤트
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);

        container.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 드래그앤드롭 기능
function setupDragAndDrop() {
    // 컨테이너에 드래그오버 이벤트 추가
    [todoListHigh, todoListMedium, todoListLow].forEach(container => {
        container.addEventListener('dragover', handleContainerDragOver);
        container.addEventListener('drop', handleContainerDrop);
        container.addEventListener('dragleave', handleContainerDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = e.target;
    draggedTodoId = parseInt(e.target.getAttribute('data-todo-id'));
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');

    // 모든 drag-over 클래스 제거
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });

    draggedElement = null;
    draggedTodoId = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(e.target.closest('.todo-container'), e.clientY);
    const draggable = document.querySelector('.dragging');
    const container = e.target.closest('.todo-container');

    if (afterElement == null) {
        container.appendChild(draggable);
    } else {
        container.insertBefore(draggable, afterElement);
    }

    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const dropTarget = e.target.closest('.todo-item');
    if (!dropTarget || !draggedElement || dropTarget === draggedElement) {
        return false;
    }

    return false;
}

function handleContainerDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');

    return false;
}

function handleContainerDragLeave(e) {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleContainerDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    e.preventDefault();

    const container = e.currentTarget;
    container.classList.remove('drag-over');

    if (!draggedTodoId) return false;

    const newPriority = container.getAttribute('data-priority');
    const draggedTodo = todos.find(t => t.id === draggedTodoId);

    if (!draggedTodo) return false;

    showLoading();
    try {
        const oldPriority = draggedTodo.priority;

        // 새로운 순서 계산
        const containerItems = Array.from(container.querySelectorAll('.todo-item'));
        const updates = [];

        containerItems.forEach((item, index) => {
            const todoId = item.getAttribute('data-todo-id');
            const todo = todos.find(t => t.id === todoId);
            if (todo) {
                todo.order = index;
                todo.priority = newPriority;
                updates.push({
                    id: todoId,
                    priority: newPriority,
                    order: index
                });
            }
        });

        // Supabase에 일괄 업데이트
        for (const update of updates) {
            await supabase
                .from('todos')
                .update({ priority: update.priority, order: update.order })
                .eq('id', update.id);
        }

        renderTodos();
    } catch (error) {
        console.error('Update order error:', error);
        alert('순서 업데이트 중 오류가 발생했습니다.');
        await loadTodos(); // 오류 시 다시 로드
        renderTodos();
    } finally {
        hideLoading();
    }

    return false;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 실시간 구독 설정
function setupRealtimeSubscription() {
    if (!currentProfileId) return;

    // Todos 실시간 구독
    supabase
        .channel('todos-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'todos',
                filter: `user_id=eq.${currentProfileId}`
            },
            async (payload) => {
                console.log('Realtime update:', payload);
                await loadTodos();
                renderCalendar();
                renderTodos();
            }
        )
        .subscribe();
}

// 유틸리티 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateKorean(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekDay})`;
}

// 초기화 실행
init();
