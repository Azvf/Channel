import { TagManager } from '../services/tagManager';
import { logger } from '../services/logger';
import { GameplayTag, TaggedPage } from '../types/gameplayTag';



// 获取DOM元素（延迟在初始化时绑定）
let newTagNameInput: HTMLInputElement;
let createTagBtn: HTMLButtonElement;
let currentPageTags: HTMLDivElement;
let currentPageTitle: HTMLDivElement;
let clearCacheBtn: HTMLButtonElement | null;
let debugStorageBtn: HTMLButtonElement | null;
let cleanupTagsBtn: HTMLButtonElement | null;
let toggleDebugModeBtn: HTMLButtonElement | null;
let autocompleteDropdown: HTMLDivElement;

// 模式切换相关元素
let modeTitle: HTMLHeadingElement;
let tagFilterInput: HTMLInputElement;
let tagFilterDropdown: HTMLDivElement;
let filteredPagesList: HTMLDivElement;
let tagFilterContainer: HTMLDivElement; // 大输入框容器（chip-input），用于插入已选chips与测量
let tagFilterMeasure: HTMLSpanElement; // 用于测量当前输入文本宽度，定位下拉
let tagFilterPlaceholderDefault = '输入标签名称进行筛选';

// Tagged 筛选状态
let filterSelectedTags: GameplayTag[] = [];
let focusedFilterChipIndex = -1; // 被“选中/聚焦”的chip索引用于按键交互
let activeDropdownStrictTag: GameplayTag | null = null; // 通过方向键选中的严格匹配项

function bindDomElements(): void {
    newTagNameInput = document.getElementById('newTagName') as HTMLInputElement;
    createTagBtn = document.getElementById('createTagBtn') as HTMLButtonElement;
    currentPageTags = document.getElementById('currentPageTags') as HTMLDivElement;
    currentPageTitle = document.getElementById('currentPageTitle') as HTMLDivElement;
    clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement | null;
    debugStorageBtn = document.getElementById('debugStorageBtn') as HTMLButtonElement | null;
    cleanupTagsBtn = document.getElementById('cleanupTagsBtn') as HTMLButtonElement | null;
    toggleDebugModeBtn = document.getElementById('toggleDebugModeBtn') as HTMLButtonElement | null;
    autocompleteDropdown = document.getElementById('autocompleteDropdown') as HTMLDivElement;

    modeTitle = document.getElementById('modeTitle') as HTMLHeadingElement;
    tagFilterInput = document.getElementById('tagFilterInput') as HTMLInputElement;
    if (tagFilterInput && tagFilterInput.placeholder) {
        tagFilterPlaceholderDefault = tagFilterInput.placeholder;
    }
    tagFilterDropdown = document.getElementById('tagFilterDropdown') as HTMLDivElement;
    filteredPagesList = document.getElementById('filteredPagesList') as HTMLDivElement;
    tagFilterContainer = document.getElementById('tagFilterChipBox') as HTMLDivElement;

    // 在输入前插入测量用 span（只在 Tagged 区域使用）
    if (tagFilterContainer && tagFilterInput) {
        tagFilterMeasure = document.createElement('span');
        tagFilterMeasure.className = 'input-measure';
        tagFilterMeasure.textContent = '';
        tagFilterContainer.insertBefore(tagFilterMeasure, tagFilterInput);
    }
}

// 初始化
const tagManager = TagManager.getInstance();
let currentPage: TaggedPage | null = null;

// ========== 工具函数 ==========
/**
 * 确保当前页面在 TagManager 中已注册
 */
async function ensureCurrentPageRegistered(): Promise<void> {
    currentPage = await tagManager.ensurePageRegistered(currentPage?.id);
}

/**
 * 统一的存储同步操作
 */
async function syncStorageToChrome(): Promise<void> {
    await tagManager.syncToStorage();
}

// ========== 模式管理 ==========
export enum AppMode {
    TAGGING = 'tagging',
    TAGGED = 'tagged',
    DEBUG = 'debug'
}

const MODE_STORAGE_KEY = 'app_mode';

class ModeManager {
    private static currentMode: AppMode = AppMode.TAGGING;
    static readonly STORAGE_KEY = MODE_STORAGE_KEY;

    static async init(initialMode: AppMode) {
        // 移除旧的事件监听器（如果存在）
        modeTitle.removeEventListener('click', this.handleTitleClick);
        
        // 标题点击切换模式
        modeTitle.addEventListener('click', this.handleTitleClick);

        // 按传入的初始模式完成初始化，避免先显示默认模式再跳转
        await this.setMode(initialMode, { skipStorageWrite: true });
    }

    private static handleTitleClick = async () => {
        try {
            await this.toggleMode();
        } catch (error) {
            console.error('Error in toggleMode:', error);
        }
    };

    private static async saveModeToStorage() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.currentMode });
        } catch (error) {
            console.error('保存模式失败:', error);
        }
    }

    static async toggleMode() {
        const newMode = this.currentMode === AppMode.TAGGING ? AppMode.TAGGED : AppMode.TAGGING;
        await this.setMode(newMode);
    }

    static async toggleDebugMode() {
        const targetMode = this.currentMode === AppMode.DEBUG ? AppMode.TAGGING : AppMode.DEBUG;
        await this.setMode(targetMode);
    }

    static getCurrentMode(): AppMode {
        return this.currentMode;
    }

    static async setMode(mode: AppMode, options?: { skipStorageWrite?: boolean }) {
        this.currentMode = mode;
        
        if (!options?.skipStorageWrite) {
            // 保存模式到存储
            await this.saveModeToStorage();
        }

        // 派发模式变更事件，由 Vue 层负责显隐与动效，避免布局抖动
        window.dispatchEvent(new CustomEvent('app:mode-changed', { detail: mode }));

        if (mode === AppMode.TAGGED) {
            // 切换到浏览模式时，重新加载数据并显示所有页面
            await tagManager.reloadFromStorage();
            this.loadAllTaggedPages();
        }
    }


    static loadAllTaggedPages() {
        const allPages = tagManager.getTaggedPages();
        this.displayFilteredPages(allPages);
    }

    static filterPagesByInputs(selectedTagIds: string[], partialText: string, strictSelectedTagId?: string) {
        const allPages = tagManager.getTaggedPages();
        const allTags = tagManager.getAllTags();

        const normalizedPartial = (partialText || '').trim().toLowerCase();
        const hasPartial = normalizedPartial.length > 0 && !strictSelectedTagId;

        const partialCandidateIds: Set<string> = new Set();
        if (hasPartial) {
            allTags.forEach(t => {
                if (t.name.toLowerCase().startsWith(normalizedPartial)) {
                    partialCandidateIds.add(t.id);
                }
            });
        }

        // 需要满足：包含所有 selectedTagIds，且：
        // - 若 strictSelectedTagId 存在，则还必须包含该 tag
        // - 否则若存在 partial 文本，则必须至少包含一个 partial 候选
        const filtered = allPages.filter(p => {
            // 所有已选标签必须包含
            for (const id of selectedTagIds) {
                if (!p.tags.includes(id)) return false;
            }
            if (strictSelectedTagId) {
                return p.tags.includes(strictSelectedTagId);
            }
            if (hasPartial) {
                return p.tags.some(id => partialCandidateIds.has(id));
            }
            return true;
        });

        this.displayFilteredPages(filtered);
    }

    private static displayFilteredPages(pages: TaggedPage[]) {
        filteredPagesList.innerHTML = '';
        
        if (pages.length === 0) {
            filteredPagesList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">暂无匹配的页面</div>';
            return;
        }

        pages.forEach(page => {
            const pageElement = this.createPageElement(page);
            filteredPagesList.appendChild(pageElement);
        });
    }

    private static createPageElement(page: TaggedPage): HTMLDivElement {
        const pageElement = document.createElement('div');
        pageElement.className = 'page-item';
        
        // 获取页面的标签信息
        const allTags = tagManager.getAllTags();
        const pageTags = allTags.filter(tag => page.tags.includes(tag.id));
        
        // 创建默认图标 - 使用简单的数据URI
        const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bS0yIDE1bC01LTUgMS40MS0xLjQxTDEwIDE0LjE3bDcuNTktNy41OUwxOSA4bC05IDl6Ii8+PC9zdmc+';
        
        // 创建图标元素
        const faviconImg = document.createElement('img');
        faviconImg.className = 'page-favicon';
        faviconImg.src = page.favicon || defaultIcon;
        faviconImg.onerror = () => {
            faviconImg.src = defaultIcon;
        };
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'page-content';
        
        // 创建标题
        const titleDiv = document.createElement('div');
        titleDiv.className = 'page-item-title';
        titleDiv.textContent = page.title;
        
        // 创建URL
        const urlDiv = document.createElement('div');
        urlDiv.className = 'page-item-url';
        urlDiv.textContent = page.url;
        
        // 创建标签容器
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'page-tags';
        
        // 创建标签元素（统一玻璃风格，不使用颜色描边）
        pageTags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'page-tag';
            tagSpan.textContent = tag.name;
            tagsDiv.appendChild(tagSpan);
        });
        
        // 组装元素
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(urlDiv);
        contentDiv.appendChild(tagsDiv);
        
        pageElement.appendChild(faviconImg);
        pageElement.appendChild(contentDiv);
        
        pageElement.addEventListener('click', () => {
            chrome.tabs.create({ url: page.url });
        });
        
        return pageElement;
    }
}


export async function loadInitialAppMode(): Promise<AppMode> {
    try {
        const result = await chrome.storage.local.get([MODE_STORAGE_KEY]);
        const savedMode = result[MODE_STORAGE_KEY] as AppMode;
        if (savedMode && Object.values(AppMode).includes(savedMode)) {
            return savedMode;
        }
    } catch (error) {
        console.error('加载模式失败:', error);
    }
    return AppMode.TAGGING;
}


// 页面更新辅助函数
class PageUpdateHelper {
    /**
     * 更新当前页面对象并重新加载显示
     */
    static async updateCurrentPageAndReload(): Promise<void> {
        if (currentPage) {
            const updatedPage = tagManager.getPageById(currentPage.id);
            if (updatedPage) {
                currentPage = updatedPage;
            }
        }
        await loadCurrentPageTags();
    }
}

// 通用操作结果处理接口
interface OperationResult {
    success: boolean;
    message: string;
    isError?: boolean;
}

// 初始化辅助函数
class InitializationHelper {
    /**
     * 初始化所有事件监听器
     */
    static initEventListeners(): void {
        // 创建标签
        createTagBtn.addEventListener('click', EventHandlerHelper.createButtonHandler(
            async () => {
                const tagName = newTagNameInput.value.trim();
                return await OperationWrapper.executeCreateTag(tagName);
            },
            '正在创建标签...',
            '标签创建'
        ));

        // 回车键创建标签（使用 keydown，确保与自动完成行为一致）
        newTagNameInput.addEventListener('keydown', EventHandlerHelper.createEnterKeyHandler(createTagBtn));

        // 清空缓存
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', EventHandlerHelper.createConfirmButtonHandler(
                '确定要清空所有本地缓存数据吗？此操作不可撤销！',
                () => OperationWrapper.executeClearCache(),
                '正在清空缓存...',
                '缓存清空'
            ));
        }

        // 标签筛选：多标签 + 部分匹配
        tagFilterInput.addEventListener('input', (e) => {
            const partial = (e.target as HTMLInputElement).value;
            focusedFilterChipIndex = -1; // 输入时取消chip聚焦
            // 用户主动输入时，清除严格选中项
            activeDropdownStrictTag = null;
            // 输入时若未通过方向键选择严格项，则按部分匹配策略
            const strictId = getActiveStrictId();
            ModeManager.filterPagesByInputs(
                filterSelectedTags.map(t => t.id),
                partial,
                strictId
            );
            renderFilterChips();
            // 更新下拉位置
            updateFilterMeasure();
            positionFilterDropdown();
            updateFilterPlaceholder();
        });

        // Backspace/Enter 行为：
        tagFilterInput.addEventListener('keydown', (e) => {
            // 交由自动完成去处理方向键，但我们需要处理 Backspace/Enter 的 chips 逻辑
            if (e.key === 'Backspace') {
                if (tagFilterInput.selectionStart === 0 && tagFilterInput.selectionEnd === 0) {
                    // 输入为空时，选中最后一个chip；再次 Backspace 删除该chip
                    if (filterSelectedTags.length > 0) {
                        if (focusedFilterChipIndex === filterSelectedTags.length - 1) {
                            // 删除最后一个chip
                            filterSelectedTags.pop();
                            focusedFilterChipIndex = -1;
                            const strictId2 = getActiveStrictId();
                            ModeManager.filterPagesByInputs(
                                filterSelectedTags.map(t => t.id),
                                tagFilterInput.value,
                                strictId2
                            );
                            renderFilterChips();
                        } else {
                            focusedFilterChipIndex = filterSelectedTags.length - 1;
                            renderFilterChips();
                        }
                        e.preventDefault();
                    }
                }
            } else if (e.key === 'Enter') {
                const partial = tagFilterInput.value.trim();
                // 若有严格选中项，则落袋为安（转为chip）
                if (activeDropdownStrictTag) {
                    commitFilterTag(activeDropdownStrictTag);
                    e.preventDefault();
                    return;
                }
                // 若当前有被聚焦的chip，则回退成可编辑文本
                if (focusedFilterChipIndex >= 0 && filterSelectedTags[focusedFilterChipIndex]) {
                    const tag = filterSelectedTags.splice(focusedFilterChipIndex, 1)[0];
                    focusedFilterChipIndex = -1;
                    tagFilterInput.value = tag.name;
                    ModeManager.filterPagesByInputs(
                        filterSelectedTags.map(t => t.id),
                        tagFilterInput.value,
                        undefined
                    );
                    renderFilterChips();
                    // 保持输入框焦点
                    setTimeout(() => tagFilterInput.focus(), 0);
                    e.preventDefault();
                    return;
                }
                // 无严格项、无chip聚焦：若输入完全等于某标签名，则转为chip
                if (partial) {
                    const exact = tagManager.findTagByName(partial);
                    if (exact) {
                        commitFilterTag(exact);
                        e.preventDefault();
                    }
                }
            }
        });

        // 页面卸载和隐藏事件 - 统一处理存储同步
        const handleStorageSync = () => {
            ErrorHandler.executeWithErrorHandling(
                syncStorageToChrome,
                '保存数据失败',
                '存储同步'
            );
        };
        
        window.addEventListener('beforeunload', handleStorageSync);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                handleStorageSync();
            }
        });

        // 调试存储状态
        if (debugStorageBtn) {
            debugStorageBtn.addEventListener('click', async () => {
                await ErrorHandler.executeWithErrorHandling(
                    async () => {
                        await OperationWrapper.executeDebugStorage();
                        const stats = tagManager.getDataStats();
                        return `调试信息已输出到控制台 - 内存: 标签${stats.tagsCount}, 页面${stats.pagesCount}`;
                    },
                    '获取存储状态失败',
                    '存储状态调试'
                );
            });
        }

        // 调试模式切换
        if (toggleDebugModeBtn) {
            toggleDebugModeBtn.addEventListener('click', async () => {
                await ErrorHandler.executeWithErrorHandling(
                    async () => {
                        await ModeManager.toggleDebugMode();
                        return null;
                    },
                    '切换调试模式失败',
                    '调试模式切换'
                );
            });
        }

        // 清理未使用标签
        if (cleanupTagsBtn) {
            cleanupTagsBtn.addEventListener('click', EventHandlerHelper.createConfirmButtonHandler(
                '确定要清理所有未使用的标签吗？此操作将删除没有被任何页面使用的标签。',
                async () => {
                    const beforeStats = tagManager.getDataStats();
                    tagManager.cleanupUnusedTags();
                    const afterStats = tagManager.getDataStats();
                    await tagManager.syncToStorage();
                    
                    const cleanedCount = beforeStats.tagsCount - afterStats.tagsCount;
                    return { 
                        success: true, 
                        message: `清理完成，删除了 ${cleanedCount} 个未使用的标签` 
                    };
                },
                '正在清理标签...',
                '标签清理'
            ));
        }
    }
}

// 事件监听器辅助函数
class EventHandlerHelper {
    /**
     * 创建带状态更新的按钮点击事件处理器
     */
    static createButtonHandler(
        operation: () => Promise<OperationResult>,
        _loadingMessage: string,
        context: string
    ): () => Promise<void> {
        return async () => {
            await ErrorHandler.executeWithStatusUpdate(
                async () => {
                    const opResult = await operation();
                    return opResult.message;
                },
                _loadingMessage,
                '', // 成功消息将在操作中设置
                `${context}失败`,
                context
            );
        };
    }

    /**
     * 创建确认对话框的按钮处理器
     */
    static createConfirmButtonHandler(
        confirmMessage: string,
        operation: () => Promise<OperationResult>,
        _loadingMessage: string,
        context: string
    ): () => Promise<void> {
        return async () => {
            if (confirm(confirmMessage)) {
                await ErrorHandler.executeWithStatusUpdate(
                    async () => {
                        const opResult = await operation();
                        return opResult.message;
                    },
                    _loadingMessage,
                    '', // 成功消息将在操作中设置
                    `${context}失败`,
                    context
                );
            }
        };
    }

    /**
     * 创建回车键事件处理器
     */
    static createEnterKeyHandler(button: HTMLButtonElement): (e: KeyboardEvent) => void {
        return (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                button.click();
            }
        };
    }
}

// 通用操作包装器
class OperationWrapper {
    /**
     * 通用Tag操作执行器
     * 统一处理所有Tag相关操作的通用逻辑：验证、执行、更新、同步
     */
    private static async executeTagOperationCore<T>(
        validate: () => Promise<{ valid: boolean; error?: string }>,
        operation: () => Promise<T>,
        onSuccess: (result: T) => Promise<void>,
        successMessage: string | ((result: T) => string),
        errorMessage: string
    ): Promise<OperationResult> {
        // 验证
        const validation = await validate();
        if (!validation.valid) {
            return { success: false, message: validation.error || errorMessage, isError: true };
        }

        try {
            // 执行操作
            const result = await operation();
            
            // 成功后处理
            await onSuccess(result);
            
            // 页面更新和存储同步
            await tagManager.syncToStorage();
            await PageUpdateHelper.updateCurrentPageAndReload();
            
            // 返回成功消息
            const message = typeof successMessage === 'function' 
                ? successMessage(result) 
                : successMessage;
            return { success: true, message };
        } catch (error) {
            console.error('操作执行失败:', error);
            return { success: false, message: errorMessage, isError: true };
        }
    }

    /**
     * 执行标签操作（添加/移除）的通用包装器
     */
    static async executeTagOperation(
        operation: 'add' | 'remove',
        tagId: string,
        successMessage: string,
        errorMessage: string
    ): Promise<OperationResult> {
    const log = logger('TagOp');
    const t = log.timeStart('execute');
    log.debug('start', { operation, tagId, pageId: currentPage?.id });
    const result = await this.executeTagOperationCore(
            // 验证
            async () => {
                if (!currentPage) {
                log.error('no currentPage', { operation, tagId });
                    return { valid: false, error: '当前页面为空' };
                }
                return { valid: true };
            },
            // 执行操作
            async () => {
                const opTimer = log.timeStart('op');
                log.debug('executing', { operation, tagId, pageId: currentPage!.id });
                
                // 使用 tagManager 的统一接口
                const success = tagManager.toggleTagOnPage(
                    currentPage!.id, 
                    tagId, 
                    operation === 'add'
                );
                
                if (!success) {
                    log.warn('op returned false', { operation, tagId, pageId: currentPage!.id });
                    throw new Error(`${operation === 'add' ? '添加' : '移除'}标签失败`);
                }
                
                log.timeEnd(opTimer, { stage: 'op', operation, tagId, pageId: currentPage!.id });
                return { success };
            },
            // 成功后处理
            async () => {
                // 操作已在上面执行，这里不需要额外操作
            },
            // 成功消息
            successMessage,
            // 错误消息
            errorMessage
    );
    log.timeEnd(t, { stage: 'execute', operation, tagId, pageId: currentPage?.id });
    log.debug('end', { result });
    return result;
    }

    /**
     * 执行创建标签操作的通用包装器
     */
    static async executeCreateTag(tagName: string): Promise<OperationResult> {
    const log = logger('CreateTag');
    const t = log.timeStart('execute');
    log.debug('start', { tagName, pageId: currentPage?.id });
    const result = await this.executeTagOperationCore(
            // 验证
            async () => tagManager.validateTagName(tagName),
            // 执行操作
            async () => {
                const trimmedName = tagName.trim();
                log.debug('executing', { trimmedName });
                
                // 确保当前页面在 TagManager 中已注册
                await ensureCurrentPageRegistered();
                
                // 此时 currentPage 一定不为 null
                if (!currentPage) {
                    throw new Error('无法获取当前页面');
                }
                
                // 使用 tagManager 的高级方法创建标签并添加到页面
                // 先检查是否存在同名标签用于日志记录
                const existing = tagManager.findTagByName(trimmedName);
                const tag = tagManager.createTagAndAddToPage(trimmedName, currentPage.id);
                
                // 判断是使用现有标签还是创建了新标签
                log.info(existing && existing.id === tag.id ? 'hit existing' : 'created', 
                    { tagId: tag.id, name: tag.name }
                );
                
                return tag;
            },
            // 成功后处理
            async () => {
                // 清空输入框
                newTagNameInput.value = '';
                // 重新加载当前页面标签
                if (currentPage) {
                await loadCurrentPageTags();
                }
            },
            // 成功消息
            (result) => {
                if (result && typeof result === 'object' && 'name' in result) {
                    return `标签 "${(result as any).name}" 已添加到当前页面`;
                }
                return '标签已添加到当前页面';
            },
            // 错误消息
            '创建标签失败'
    );
    log.timeEnd(t, { stage: 'execute', tagName, pageId: currentPage?.id });
    log.debug('end', { result });
    return result;
    }

    /**
     * 执行清空缓存操作的通用包装器
     */
    static async executeClearCache(): Promise<OperationResult> {
        try {
            await chrome.storage.local.clear();
            tagManager.clearAllData();
            await initializePage();
            return { success: true, message: '本地缓存已清空' };
        } catch (error) {
            console.error('清空缓存失败:', error);
            return { success: false, message: '清空缓存失败', isError: true };
        }
    }

    /**
     * 执行调试存储状态操作
     */
    static async executeDebugStorage(): Promise<void> {
        // 重新加载数据确保最新状态
        await tagManager.reloadFromStorage();
        // 检查Chrome存储（仅确保无异常即可）
        await chrome.storage.local.get(['gameplay_tags', 'tagged_pages']);
        
        // 执行存储测试
        await tagManager.testStorage();
    }
}

// 通用DOM操作处理器
class DOMOperationHandler {
    static clearAndFill<T>(
        container: HTMLElement,
        items: T[],
        createElement: (item: T) => HTMLElement,
        emptyMessage?: string
    ): void {
        container.innerHTML = '';
        
        if (items.length === 0 && emptyMessage) {
            container.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 20px;">${emptyMessage}</div>`;
            return;
        }
        
        items.forEach(item => {
            const element = createElement(item);
            container.appendChild(element);
        });
    }
}

// 通用错误处理处理器
class ErrorHandler {
    static async executeWithErrorHandling<T>(
        operation: () => Promise<T>,
        errorMessage: string,
        context?: string
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error);
            return null;
        }
    }

    static async executeWithStatusUpdate<T>(
        operation: () => Promise<T>,
        _loadingMessage: string,
        _successMessage: string,
        errorMessage: string,
        context?: string
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error);
            return null;
        }
    }
}

// 自动完成功能处理器
class AutocompleteHandler {
    private static selectedIndex = -1;
    private static currentMatches: GameplayTag[] = [];
    private static currentQuery = '';

    static init(input: HTMLInputElement, dropdown: HTMLDivElement) {
        input.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.trim();
            this.handleInput(input, query, dropdown);
        });

        input.addEventListener('keydown', (e) => {
            this.handleKeydown(e, input, dropdown);
        });

        input.addEventListener('blur', () => {
            // 延迟隐藏，让点击事件先触发
            setTimeout(() => this.hideDropdown(dropdown), 150);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                this.handleInput(input, input.value.trim(), dropdown);
            }
        });
    }

    private static handleInput(input: HTMLInputElement, query: string, dropdown: HTMLDivElement) {
        if (!query) {
            this.hideDropdown(dropdown);
            return;
        }

        const allTags = tagManager.getAllTags();
        this.currentMatches = allTags.filter(tag => 
            tag.name.toLowerCase().includes(query.toLowerCase())
        );
        this.currentQuery = query;

        if (this.currentMatches.length === 0) {
            this.hideDropdown(dropdown);
            return;
        }

        this.showDropdown(input, dropdown, this.currentMatches);
        this.selectedIndex = -1;
    }

    private static handleKeydown(e: KeyboardEvent, input: HTMLInputElement, dropdown: HTMLDivElement) {
        if (!dropdown.classList.contains('show')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentMatches.length - 1);
                this.updateSelection(dropdown);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(dropdown);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < this.currentMatches.length) {
                    // 如果有选中项，调用 selectItem（它已经会处理创建标签的逻辑）
                    this.selectItem(this.currentMatches[this.selectedIndex], input, dropdown);
                    // 如果是 Tagging 页面且有选中项，selectItem 已经处理了创建，不需要再次调用
                    // 直接返回，避免重复调用
                    return;
                } else if (input === tagFilterInput && this.currentQuery) {
                    // 没有选中项但有输入：保留文本筛选并关闭下拉
                    activeDropdownStrictTag = null;
                    tagFilterInput.value = this.currentQuery;
                    ModeManager.filterPagesByInputs(
                        filterSelectedTags.map(t => t.id),
                        this.currentQuery,
                        undefined
                    );
                    this.hideDropdown(dropdown);
                }
                // Tagging 输入框：没有选中项时才创建标签（有选中项的情况已经在上面处理）
                if (input === newTagNameInput && createTagBtn) {
                    createTagBtn.click();
                }
                break;
            case 'Escape':
                this.hideDropdown(dropdown);
                break;
        }
    }

    private static showDropdown(input: HTMLInputElement, dropdown: HTMLDivElement, matches: GameplayTag[]) {
        dropdown.innerHTML = '';
        
        matches.forEach((tag) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="tag-color" style="background-color: ${tag.color}"></div>
                <div class="tag-name">${tag.name}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectItem(tag, input, dropdown);
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.classList.add('show');
        if (input === tagFilterInput) {
            positionFilterDropdown();
        }
    }

    private static hideDropdown(dropdown: HTMLDivElement) {
        dropdown.classList.remove('show');
        this.selectedIndex = -1;
    }

    private static updateSelection(dropdown: HTMLDivElement) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    private static selectItem(tag: GameplayTag, input: HTMLInputElement, dropdown: HTMLDivElement) {
        this.hideDropdown(dropdown);
        if (input === tagFilterInput) {
            // Tagged 页面：点击下拉框中的 tag 时，直接提交为 chip（和按 Enter 一样）
            commitFilterTag(tag);
        } else {
            // Tagging 页面：点击下拉框中的 tag 时，直接创建标签（和按 Enter 一样）
            input.value = tag.name;
            if (createTagBtn) {
                createTagBtn.click();
            }
        }
    }
}

// 初始化页面
async function initializePage(initialMode?: AppMode) {
    await ErrorHandler.executeWithStatusUpdate(
        async () => {
            // 首先初始化TagManager，确保数据从存储中加载
            await tagManager.initialize();
        
            // 获取当前标签页信息并创建页面记录
            currentPage = await tagManager.getCurrentTabAndRegisterPage();
            
            // 加载所有数据
            await loadCurrentPageTags();
            
            // 初始化自动完成功能
            AutocompleteHandler.init(newTagNameInput, autocompleteDropdown);
            
            // 初始化模式管理器
            const resolvedMode = initialMode ?? ModeManager.getCurrentMode();
            await ModeManager.init(resolvedMode);
            
            // 初始化标签筛选的自动完成功能
            AutocompleteHandler.init(tagFilterInput, tagFilterDropdown);
            
            // 初始化所有事件监听器
            InitializationHelper.initEventListeners();
            updateFilterPlaceholder();
            
            // 显示数据加载状态
            const stats = tagManager.getDataStats();
            return `加载完成 - 标签: ${stats.tagsCount}, 页面: ${stats.pagesCount}`;
        },
        '正在加载...',
        '',
        '初始化失败',
        '页面初始化'
    );
}


// 加载当前页面标签
async function loadCurrentPageTags() {
    if (!currentPage) {
        currentPageTitle.textContent = '无当前页面';
        return;
    }
    
    // 显示当前页面标题
    currentPageTitle.textContent = `${currentPage.title} (${currentPage.tags.length} 个标签)`;
    
    const allTags = tagManager.getAllTags();
    const pageTags = allTags.filter(tag => currentPage!.tags.includes(tag.id));
    
    // 只显示当前页面拥有的标签
    DOMOperationHandler.clearAndFill(
        currentPageTags,
        pageTags,
        (tag) => createTagElement(tag)
    );
}

// 创建标签元素 - 纯CSS样式
function createTagElement(tag: GameplayTag): HTMLDivElement {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag-item selected';
    
    // 文字
    const nameSpan = document.createElement('span');
    nameSpan.textContent = tag.name;
    tagElement.appendChild(nameSpan);
    
    // 删除按钮
    const removeSpan = document.createElement('span');
    removeSpan.className = 'tag-remove';
    removeSpan.textContent = '×';
    removeSpan.title = '点击移除标签';
    tagElement.appendChild(removeSpan);
    
    // 点击整块移除
    tagElement.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTagPageOperation('remove', tag.id);
    });
    // 点击×移除（阻止冒泡）
    removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTagPageOperation('remove', tag.id);
    });
    
    tagElement.title = '点击移除标签';
    return tagElement;
}


// 添加标签到页面或从页面移除标签（统一接口）
async function handleTagPageOperation(operation: 'add' | 'remove', tagId: string): Promise<void> {
    await OperationWrapper.executeTagOperation(
        operation,
        tagId,
        operation === 'add' ? '标签已添加' : '标签已移除',
        operation === 'add' ? '添加标签失败' : '移除标签失败'
    );
}

export async function initializePopup(initialMode: AppMode): Promise<void> {
    bindDomElements();
    await initializePage(initialMode);
}

// —— Tagged 多标签筛选辅助 ——
function renderFilterChips(): void {
    if (!tagFilterContainer || !tagFilterInput) return;
    // 清理已有chips（避免重复）
    const existing = Array.from(tagFilterContainer.querySelectorAll('.filter-chip'));
    existing.forEach(el => el.remove());

    // 在输入框前依次插入
    filterSelectedTags.forEach((tag, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-item selected filter-chip';
        if (index === focusedFilterChipIndex) {
            chip.classList.add('focused');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = tag.name;
        chip.appendChild(nameSpan);

        const remove = document.createElement('span');
        remove.className = 'tag-remove';
        remove.textContent = '×';
        remove.title = '移除筛选标签';
        chip.appendChild(remove);

        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            focusedFilterChipIndex = index;
            renderFilterChips();
            tagFilterInput.focus();
        });
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            filterSelectedTags.splice(index, 1);
            focusedFilterChipIndex = -1;
            ModeManager.filterPagesByInputs(
                filterSelectedTags.map(t => t.id),
                tagFilterInput.value,
                activeDropdownStrictTag?.id
            );
            renderFilterChips();
        });

        tagFilterContainer.insertBefore(chip, tagFilterInput);
    });

    // 更新测量器与下拉位置
    updateFilterMeasure();
    positionFilterDropdown();
    updateFilterPlaceholder();
}

function commitFilterTag(tag: GameplayTag): void {
    // 若已存在则忽略
    if (!filterSelectedTags.some(t => t.id === tag.id)) {
        filterSelectedTags.push(tag);
    }
    activeDropdownStrictTag = null;
    tagFilterInput.value = '';
    focusedFilterChipIndex = -1;
    renderFilterChips();
    ModeManager.filterPagesByInputs(
        filterSelectedTags.map(t => t.id),
        '',
        undefined
    );
}

function updateFilterMeasure(): void {
    if (!tagFilterMeasure || !tagFilterInput) return;
    // 使用与输入框一致的文本，保持前缀定位（末尾插入零宽空格避免宽度为0）
    const val = tagFilterInput.value || '';
    tagFilterMeasure.textContent = val.length > 0 ? val : '\u200b';
    // 绝对定位于输入框起点（使用 rect 相对容器计算），不参与布局
    const containerRect = tagFilterContainer.getBoundingClientRect();
    const inputRect = tagFilterInput.getBoundingClientRect();
    tagFilterMeasure.style.left = (inputRect.left - containerRect.left) + 'px';
    tagFilterMeasure.style.top = (inputRect.top - containerRect.top) + 'px';
}

function positionFilterDropdown(): void {
    if (!tagFilterContainer || !tagFilterDropdown || !tagFilterMeasure) return;
    if (!tagFilterDropdown.classList.contains('show')) return;
    // 使用 rect 相对容器计算，避免布局流变动误差
    const containerRect = tagFilterContainer.getBoundingClientRect();
    const inputRect = tagFilterInput.getBoundingClientRect();
    const measureRect = tagFilterMeasure.getBoundingClientRect();
    const left = measureRect.right - containerRect.left; // 文本末端
    const top = inputRect.bottom - containerRect.top;    // 输入框底部
    tagFilterDropdown.style.left = left + 'px';
    tagFilterDropdown.style.top = top + 'px';
    // 占据剩余行宽，便于内部自动换行展示
    tagFilterDropdown.style.right = '10px';
}

function updateFilterPlaceholder(): void {
    if (!tagFilterInput) return;
    const hasChips = filterSelectedTags.length > 0;
    const hasText = (tagFilterInput.value || '').trim().length > 0;
    tagFilterInput.placeholder = (hasChips || hasText) ? '' : tagFilterPlaceholderDefault;
}

// 视口变化时，若下拉打开则重算位置
window.addEventListener('resize', () => {
    positionFilterDropdown();
});

function getActiveStrictId(): string | undefined {
    if (!activeDropdownStrictTag) return undefined;
    return (activeDropdownStrictTag as GameplayTag).id;
}
