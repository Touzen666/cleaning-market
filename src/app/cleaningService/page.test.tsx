// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidatesResponse, DateRange } from "./_components/view-model";
import { createCleaningPreviewFixture } from "./preview/fixtures";

type PanelProps = {
  data?: CandidatesResponse;
  loading?: boolean;
  refreshing?: boolean;
  error?: string;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
};
type Access = {
  canPlan: boolean;
  role: string;
  authSource: "cleaning" | "session";
};
type QueryError = { data: { code: string } };

const mocks = vi.hoisted(() => {
  const accessQuery = vi.fn();
  const candidatesQuery = vi.fn();
  const cleaning = {
    access: { useQuery: accessQuery },
    listOverview: { useQuery: candidatesQuery },
  };
  const cleaningAuth = {};
  const candidatesUtils = { cancel: vi.fn(), fetch: vi.fn(), setData: vi.fn() };
  const utils = { cleaning: { listOverview: candidatesUtils } };
  const queryClient = { cancelQueries: vi.fn(), removeQueries: vi.fn() };
  const router = { replace: vi.fn() };
  return {
    accessQuery,
    candidatesQuery,
    cleaning,
    cleaningAuth,
    candidatesUtils,
    utils,
    queryClient,
    router,
    signOut: vi.fn(),
    accessRefetch: vi.fn(),
    panel: vi.fn<(props: PanelProps) => void>(),
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next-auth/react", () => ({ signOut: mocks.signOut }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mocks.queryClient,
}));
vi.mock("@trpc/react-query", () => ({
  getQueryKey: (procedure: unknown) => {
    if (procedure === mocks.cleaning) return ["cleaning"];
    if (procedure === mocks.cleaningAuth) return ["cleaningAuth"];
    if (procedure === mocks.cleaning.listOverview)
      return ["cleaning", "listOverview"];
    throw new Error("Unexpected procedure in controller test");
  },
}));
vi.mock("@/trpc/react", () => ({
  api: {
    cleaning: mocks.cleaning,
    cleaningAuth: mocks.cleaningAuth,
    useUtils: () => mocks.utils,
  },
}));
vi.mock("./_components/candidates-panel", () => ({
  CleaningCandidatesPanel: (props: PanelProps) => {
    mocks.panel(props);
    return (
      <section aria-label="Testowy panel kandydatów">
        <output aria-label="Odczyt">
          {props.data?.revision ?? "brak danych"}
        </output>
        <output aria-label="Zakres">
          {props.range.from}/{props.range.to}
        </output>
        {props.error && <div role="alert">{props.error}</div>}
        <button onClick={props.onRefresh}>Odśwież testowo</button>
        <button
          onClick={() =>
            props.onRangeChange({ from: "2026-11-01", to: "2026-11-08" })
          }
        >
          Zmień zakres testowo
        </button>
      </section>
    );
  },
}));

import CleaningHomePage from "./page";

vi.mock("./_components/workforce-panel", () => ({
  WorkforcePanel: ({ manager }: { manager: boolean }) => <section aria-label="Własny grafik pracownika"><h1>{manager ? "Panel koordynatora" : "Panel pracownika"}</h1></section>,
}));

const fixtureDate = new Date("2026-10-25T12:00:00Z");
let fixture: CandidatesResponse;

function setAccess(data: Access | undefined, error?: QueryError) {
  mocks.accessQuery.mockReturnValue({
    data,
    error,
    isPending: false,
    refetch: mocks.accessRefetch,
  });
}

function panelProps() {
  const props = mocks.panel.mock.calls.at(-1)?.[0];
  if (!props) throw new Error("The coordinator panel was not rendered");
  return props;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

describe("cleaning panel controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Next supplies the automatic JSX runtime; the repository's Vitest transform is classic.
    vi.stubGlobal("React", React);
    fixture = createCleaningPreviewFixture(fixtureDate);
    localStorage.clear();
    localStorage.setItem("cleaningAuthToken", "synthetic-token");
    setAccess({ canPlan: true, role: "MANAGER", authSource: "cleaning" });
    mocks.candidatesQuery.mockReturnValue({
      data: fixture,
      error: undefined,
      isPending: false,
      isFetching: false,
    });
    mocks.candidatesUtils.cancel.mockResolvedValue(undefined);
    mocks.candidatesUtils.fetch.mockResolvedValue(fixture);
    mocks.queryClient.cancelQueries.mockResolvedValue(undefined);
    mocks.accessRefetch.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not enable the planning feed for an ordinary cleaner or show coordinator data", () => {
    setAccess({ canPlan: false, role: "CLEANER", authSource: "cleaning" });
    render(<CleaningHomePage />);
    expect(
      screen.getByRole("heading", { name: "Panel pracownika" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Własny grafik pracownika" })).toBeInTheDocument();
    expect(screen.queryByText("Panel koordynatora")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Testowy panel kandydatów" }),
    ).not.toBeInTheDocument();
    expect(mocks.panel).not.toHaveBeenCalled();
    for (const call of mocks.candidatesQuery.mock.calls) {
      expect(call[1]).toMatchObject({ enabled: false });
    }
    expect(mocks.candidatesUtils.fetch).not.toHaveBeenCalled();
  });

  it("forces a complete fresh read and publishes it under the ordinary range query key", async () => {
    const latest = { ...fixture, revision: "fresh-synthetic-revision" };
    mocks.candidatesUtils.fetch.mockResolvedValue(latest);
    render(<CleaningHomePage />);
    const input = { ...panelProps().range, includeReviews: true };
    fireEvent.click(screen.getByRole("button", { name: "Odśwież testowo" }));
    await waitFor(() =>
      expect(mocks.candidatesUtils.setData).toHaveBeenCalledWith(input, latest),
    );
    expect(mocks.candidatesUtils.cancel).toHaveBeenCalledWith(input);
    expect(mocks.candidatesUtils.fetch).toHaveBeenCalledWith(
      { ...input, forceRefresh: true },
      { staleTime: 0 },
    );
    expect(
      mocks.candidatesUtils.cancel.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.candidatesUtils.fetch.mock.invocationCallOrder[0]!);
    expect(panelProps().refreshing).toBe(false);
    expect(panelProps().error).toBeUndefined();
  });

  it.each(["UNAUTHORIZED", "FORBIDDEN"])(
    "hides the previous feed after refresh returns %s and rechecks access",
    async (code) => {
      mocks.candidatesUtils.fetch.mockRejectedValue({ data: { code } });
      render(<CleaningHomePage />);
      expect(screen.getByLabelText("Odczyt")).toHaveTextContent(
        fixture.revision,
      );
      fireEvent.click(screen.getByRole("button", { name: "Odśwież testowo" }));
      await waitFor(() =>
        expect(screen.getByLabelText("Odczyt")).toHaveTextContent(
          "brak danych",
        ),
      );
      expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ["cleaning", "listOverview"],
      });
      expect(mocks.accessRefetch).toHaveBeenCalledOnce();
      expect(mocks.candidatesUtils.setData).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        code === "UNAUTHORIZED" ? "Sesja wygasła" : "nie ma dostępu",
      );
    },
  );

  it("redirects an unauthenticated user to cleaning login and clears cached cleaning data", async () => {
    setAccess(undefined, { data: { code: "UNAUTHORIZED" } });
    render(<CleaningHomePage />);
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/cleaningService/login",
      ),
    );
    expect(localStorage.getItem("cleaningAuthToken")).toBeNull();
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: ["cleaning"],
    });
    expect(mocks.panel).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Sprawdzanie dostępu");
  });

  it("cancels outstanding cleaning reads before clearing authentication and query data on logout", async () => {
    const cancellation = deferred<void>();
    mocks.queryClient.cancelQueries.mockReturnValue(cancellation.promise);
    render(<CleaningHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    expect(screen.getByRole("status")).toHaveTextContent("Wylogowywanie");
    expect(mocks.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ["cleaning"],
    });
    expect(localStorage.getItem("cleaningAuthToken")).toBe("synthetic-token");
    expect(mocks.queryClient.removeQueries).not.toHaveBeenCalled();
    await act(async () => {
      cancellation.resolve();
      await cancellation.promise;
    });
    expect(localStorage.getItem("cleaningAuthToken")).toBeNull();
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: ["cleaning"],
    });
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: ["cleaningAuth"],
    });
    expect(mocks.router.replace).toHaveBeenCalledWith("/cleaningService/login");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.candidatesQuery.mock.calls.at(-1)?.[1]).toMatchObject({
      enabled: false,
    });
  });

  it("also signs out the app session when it is the active source of coordinator access", async () => {
    setAccess({ canPlan: true, role: "ADMIN", authSource: "session" });
    render(<CleaningHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    await waitFor(() =>
      expect(mocks.signOut).toHaveBeenCalledWith({
        callbackUrl: "/cleaningService/login",
      }),
    );
    expect(localStorage.getItem("cleaningAuthToken")).toBeNull();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("does not publish a completed refresh for a range the coordinator has already left", async () => {
    const pending = deferred<CandidatesResponse>();
    mocks.candidatesUtils.fetch.mockReturnValue(pending.promise);
    render(<CleaningHomePage />);
    const previousInput = { ...panelProps().range, includeReviews: true };
    fireEvent.click(screen.getByRole("button", { name: "Odśwież testowo" }));
    await waitFor(() =>
      expect(mocks.candidatesUtils.fetch).toHaveBeenCalledWith(
        { ...previousInput, forceRefresh: true },
        { staleTime: 0 },
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Zmień zakres testowo" }),
    );
    expect(panelProps().range).toEqual({
      from: "2026-11-01",
      to: "2026-11-08",
    });
    expect(panelProps().refreshing).toBe(false);
    await act(async () => {
      pending.resolve({ ...fixture, revision: "obsolete-range" });
      await pending.promise;
    });
    expect(mocks.candidatesUtils.setData).not.toHaveBeenCalled();
    expect(mocks.candidatesQuery.mock.calls.at(-1)?.[0]).toEqual({
      from: "2026-11-01",
      to: "2026-11-08",
      includeReviews: true,
    });
    expect(panelProps().error).toBeUndefined();
  });

  it("does not restore planning data when a pending refresh finishes after logout", async () => {
    const pending = deferred<CandidatesResponse>();
    mocks.candidatesUtils.fetch.mockReturnValue(pending.promise);
    render(<CleaningHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Odśwież testowo" }));
    await waitFor(() =>
      expect(mocks.candidatesUtils.fetch).toHaveBeenCalledOnce(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/cleaningService/login",
      ),
    );
    await act(async () => {
      pending.resolve(fixture);
      await pending.promise;
    });
    expect(mocks.candidatesUtils.setData).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("region", { name: "Testowy panel kandydatów" }),
    ).not.toBeInTheDocument();
  });
});
