import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider, useAppContext } from "./AppContext";
import { currentPageService } from "../../services/popup/currentPageService";
import type { GameplayTag, TaggedPage } from "../../types/gameplayTag";

jest.mock("../../services/popup/currentPageService");

const mockedPageService = currentPageService as jest.Mocked<typeof currentPageService>;

const MOCK_TAGS: GameplayTag[] = [
  {
    id: "t1",
    name: "React",
    description: "UI Library",
    color: "#61dafb",
    createdAt: 1,
    updatedAt: 1,
    bindings: [],
  },
];

const MOCK_PAGES: TaggedPage[] = [
  {
    id: "p1",
    url: "https://example.com",
    title: "Test Page",
    domain: "example.com",
    tags: ["t1"],
    createdAt: 1,
    updatedAt: 1,
  },
];

const MOCK_STATS = { todayCount: 5, streak: 10 };

const TestConsumer = () => {
  const { allTags, allPages, stats, loading, error, refreshAllData } = useAppContext();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {allTags.map((tag) => (
        <div key={tag.id}>{tag.name}</div>
      ))}
      {allPages.map((page) => (
        <div key={page.id}>{page.title}</div>
      ))}
      <div>Stats: {stats.streak}</div>
      <button onClick={refreshAllData}>Refresh</button>
    </div>
  );
};

describe("AppContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPageService.getAllTags.mockResolvedValue(MOCK_TAGS);
    mockedPageService.getAllTaggedPages.mockResolvedValue(MOCK_PAGES);
    mockedPageService.getUserStats.mockResolvedValue(MOCK_STATS);
  });

  it("should load all data on mount and provide it", async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Test Page")).toBeInTheDocument();
      expect(screen.getByText("Stats: 10")).toBeInTheDocument();
    });

    expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(1);
    expect(mockedPageService.getAllTaggedPages).toHaveBeenCalledTimes(1);
    expect(mockedPageService.getUserStats).toHaveBeenCalledTimes(1);
  });

  it("should provide error state on fetch failure", async () => {
    mockedPageService.getAllTags.mockRejectedValue(new Error("Fetch Failed"));

    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error: Fetch Failed")).toBeInTheDocument();
    });
  });

  it("should call refreshAllData and refetch data", async () => {
    const user = userEvent.setup();

    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Stats: 10")).toBeInTheDocument();
    });

    expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(1);
    expect(mockedPageService.getAllTaggedPages).toHaveBeenCalledTimes(1);
    expect(mockedPageService.getUserStats).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByText("Refresh");
    await act(async () => {
      await user.click(refreshButton);
    });

    await waitFor(() => {
      expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(2);
      expect(mockedPageService.getAllTaggedPages).toHaveBeenCalledTimes(2);
      expect(mockedPageService.getUserStats).toHaveBeenCalledTimes(2);
    });
  });
});
