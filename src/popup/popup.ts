import { TagManager } from '../services/tagManager';
import { ModeManager, configureModeManager } from '../services/popup/modeManager';
import type { AppMode } from '../services/popup/modeManager';
import { DOMOperationHandler } from '../services/popup/domOperationHandler';
import { ErrorHandler } from '../services/popup/errorHandler';
import { EventHandlerHelper } from '../services/popup/eventHandlerHelper';
import { FilterManager } from '../services/popup/filterManager';
import { AutocompleteController } from '../services/popup/autocompleteController';
import { OperationWrapper, configureOperationWrapper } from '../services/popup/operationWrapper';
import { GameplayTag, TaggedPage } from '../types/gameplayTag';

export { AppMode, loadInitialAppMode } from '../services/popup/modeManager';



// 获取DOM元素（延迟在初始化时绑定）
let newTagNameInput: HTMLInputElement;
let createTagBtn: HTMLButtonElement;
let currentPageTags: HTMLDivElement;
let currentPageTitle: HTMLDivElement;
let clearCacheBtn: HTMLButtonElement | null;
let debugStorageBtn: HTMLButtonElement | null;
let cleanupTagsBtn: HTMLButtonElement | null;
let toggleDebugModeBtn: HTMLButtonElement | null;
let getVideoTimestampBtn: HTMLButtonElement | null;
let autocompleteDropdown: HTMLDivElement;

// 模式切换相关元素
let modeTitle: HTMLHeadingElement;
let tagFilterInput: HTMLInputElement;
let tagFilterDropdown: HTMLDivElement;
let filteredPagesList: HTMLDivElement;
let tagFilterContainer: HTMLDivElement; // 大输入框容器（chip-input），用于插入已选chips与测量
let tagFilterMeasure: HTMLSpanElement; // 用于测量当前输入文本宽度，定位下拉
let tagFilterPlaceholderDefault = '输入标签名称进行筛选';
let filterResizeListenerRegistered = false;

function bindDomElements(): void {
    newTagNameInput = document.getElementById('newTagName') as HTMLInputElement;
    createTagBtn = document.getElementById('createTagBtn') as HTMLButtonElement;
    currentPageTags = document.getElementById('currentPageTags') as HTMLDivElement;
    currentPageTitle = document.getElementById('currentPageTitle') as HTMLDivElement;
    clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement | null;
    debugStorageBtn = document.getElementById('debugStorageBtn') as HTMLButtonElement | null;
    cleanupTagsBtn = document.getElementById('cleanupTagsBtn') as HTMLButtonElement | null;
    toggleDebugModeBtn = document.getElementById('toggleDebugModeBtn') as HTMLButtonElement | null;
    getVideoTimestampBtn = document.getElementById('getVideoTimestampBtn') as HTMLButtonElement | null;
    autocompleteDropdown = document.getElementById('autocompleteDropdown') as HTMLDivElement;

    modeTitle = document.getElementById('modeTitle') as HTMLHeadingElement;
    tagFilterInput = document.getElementById('tagFilterInput') as HTMLInputElement;
    if (tagFilterInput && tagFilterInput.placeholder) {
        tagFilterPlaceholderDefault = tagFilterInput.placeholder;
    }
    tagFilterDropdown = document.getElementById('tagFilterDropdown') as HTMLDivElement;
    filteredPagesList = document.getElementById('filteredPagesList') as HTMLDivElement;
    tagFilterContainer = document.getElementById('tagFilterChipBox') as HTMLDivElement;

    configureModeManager({
        modeTitle,
        filteredPagesList
    });

    // 在输入前插入测量用 span（只在 Tagged 区域使用）
    if (tagFilterContainer && tagFilterInput && tagFilterDropdown) {
        tagFilterMeasure = document.createElement('span');
        tagFilterMeasure.className = 'input-measure';
        tagFilterMeasure.textContent = '';
        tagFilterContainer.insertBefore(tagFilterMeasure, tagFilterInput);

        FilterManager.configure({
            elements: {
                input: tagFilterInput,
                dropdown: tagFilterDropdown,
                container: tagFilterContainer,
                measure: tagFilterMeasure
            },
            placeholderDefault: tagFilterPlaceholderDefault,
            onFilterChange: (selectedTagIds, partialText, strictSelectedTagId) => {
                ModeManager.filterPagesByInputs(selectedTagIds, partialText, strictSelectedTagId);
            }
        });

        if (!filterResizeListenerRegistered) {
            window.addEventListener('resize', FilterManager.handleResize);
            filterResizeListenerRegistered = true;
        }
    }

    configureOperationWrapper({
        getCurrentPage: () => currentPage,
        ensureCurrentPageRegistered,
        updateCurrentPageAndReload: () => PageUpdateHelper.updateCurrentPageAndReload(),
        loadCurrentPageTags,
        resetInitialization: () => initializePage(),
        getNewTagNameInput: () => newTagNameInput,
        dismissAutocompleteDropdown: () => {
            if (autocompleteDropdown) {
                AutocompleteController.dismissDropdown(autocompleteDropdown);
            }
        }
    });
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
        tagFilterInput.addEventListener('input', FilterManager.handleInputEvent);

        // Backspace/Enter 行为交由 FilterManager 统一处理
        tagFilterInput.addEventListener('keydown', FilterManager.handleKeydownEvent);

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

        if (getVideoTimestampBtn) {
            getVideoTimestampBtn.addEventListener('click', async () => {
                const timestampedUrl = await ErrorHandler.executeWithErrorHandling(
                    () => OperationWrapper.fetchCurrentVideoTimestamp(),
                    '获取视频时间戳失败',
                    '视频时间戳调试'
                );

                if (typeof timestampedUrl === 'string') {
                    console.log(`[Debug] 带时间戳链接: ${timestampedUrl}`);
                }
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

// 初始化页面
async function initializePage(initialMode?: AppMode) {
    await ErrorHandler.executeWithStatusUpdate(
        async () => {
            // 首先初始化TagManager，确保数据从存储中加载
            await tagManager.initialize();
        
            // 获取当前标签页信息并创建页面记录
            const timestampedUrl = await OperationWrapper.fetchCurrentVideoTimestamp();
            currentPage = await tagManager.getCurrentTabAndRegisterPage(timestampedUrl ?? undefined);
            
            // 加载所有数据
            await loadCurrentPageTags();
            
            // 初始化自动完成功能
            if (newTagNameInput && autocompleteDropdown) {
                AutocompleteController.initTagInput({
                    input: newTagNameInput,
                    dropdown: autocompleteDropdown,
                    onSubmit: () => createTagBtn.click()
                });
            }
            
            // 初始化模式管理器
            const resolvedMode = initialMode ?? ModeManager.getCurrentMode();
            await ModeManager.init(resolvedMode);
            
            // 初始化标签筛选的自动完成功能
            if (tagFilterInput && tagFilterDropdown) {
                AutocompleteController.initFilterInput({
                    input: tagFilterInput,
                    dropdown: tagFilterDropdown
                });
            }

            FilterManager.reset();
            
            // 初始化所有事件监听器
            InitializationHelper.initEventListeners();
            
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

// 视口变化时的重算逻辑由 FilterManager 接管
