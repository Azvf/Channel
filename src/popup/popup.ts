import { TagManager } from '../services/tagManager';
import { ModeManager, configureModeManager } from '../services/popup/modeManager';
import type { AppMode } from '../services/popup/modeManager';
import { ErrorHandler } from '../services/popup/errorHandler';
import { FilterManager } from '../services/popup/filterManager';
import { AutocompleteController } from '../services/popup/autocompleteController';
import { OperationWrapper, configureOperationWrapper } from '../services/popup/operationWrapper';
import {
    configureCurrentPageService,
    setCurrentPage,
    getCurrentPage,
    ensureCurrentPageRegistered,
    loadCurrentPageTags,
    refreshCurrentPage
} from '../services/popup/currentPageService';
import { bindPopupEvents } from '../services/popup/eventBinder';

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
let unbindEvents: (() => void) | null = null;

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

    configureCurrentPageService({
        elements: {
            title: currentPageTitle,
            tagsContainer: currentPageTags
        },
        onTagOperation: handleTagPageOperation
    });

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
        getCurrentPage,
        ensureCurrentPageRegistered,
        updateCurrentPageAndReload: () => refreshCurrentPage(),
        loadCurrentPageTags,
        resetInitialization: () => initializePage(),
        getNewTagNameInput: () => newTagNameInput,
        dismissAutocompleteDropdown: () => {
            if (autocompleteDropdown) {
                AutocompleteController.dismissDropdown(autocompleteDropdown);
            }
        }
    });

    if (!unbindEvents) {
        unbindEvents = bindPopupEvents({
            createTagButton: createTagBtn,
            newTagInput: newTagNameInput,
            tagFilterInput: tagFilterInput,
            onStorageSync: syncStorageToChrome,
            clearCacheButton: clearCacheBtn,
            debugStorageButton: debugStorageBtn,
            cleanupTagsButton: cleanupTagsBtn,
            toggleDebugModeButton: toggleDebugModeBtn,
            getVideoTimestampButton: getVideoTimestampBtn
        });
    }
}
// 初始化
const tagManager = TagManager.getInstance();
/**
 * 统一的存储同步操作
 */
async function syncStorageToChrome(): Promise<void> {
    await tagManager.syncToStorage();
}


// 初始化页面
async function initializePage(initialMode?: AppMode) {
    await ErrorHandler.executeWithStatusUpdate(
        async () => {
            // 首先初始化TagManager，确保数据从存储中加载
            await tagManager.initialize();
        
            // 获取当前标签页信息并创建页面记录
            const timestampedUrl = await OperationWrapper.fetchCurrentVideoTimestamp();
            const page = await tagManager.getCurrentTabAndRegisterPage(timestampedUrl ?? undefined);
            setCurrentPage(page);
            
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
