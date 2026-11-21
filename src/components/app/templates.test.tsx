import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RentStatusBadge } from "@/components/rent/rent-status-badge";

import { ActivityTimeline } from "./activity-timeline";
import { Avatar } from "./avatar";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  SortableHead,
} from "./data-table";
import { EmptyState } from "./empty-state";
import { FilterTabs } from "./filter-tabs";
import { PageHeader } from "./page-header";
import { Pagination } from "./pagination";
import { PhotoCard } from "./photo-card";
import { FactChip, RecordHeader } from "./record-header";
import { RecordTabs } from "./record-tabs";
import { SectionCard } from "./section-card";
import { ProgressBar, StatCard, StatGrid } from "./stat-card";
import { CountPill, PriorityBadge, StatusPill } from "./status-pill";

describe("StatusPill and RentStatusBadge", () => {
  it("always shows the word, with the tone as data", () => {
    render(<StatusPill tone="good">Fully let</StatusPill>);
    expect(screen.getByText("Fully let")).toHaveAttribute("data-tone", "good");
  });

  it("gives each rent status its fixed colour", () => {
    render(
      <>
        <RentStatusBadge status="paid" />
        <RentStatusBadge status="part_paid" />
        <RentStatusBadge status="due" />
        <RentStatusBadge status="late" />
      </>,
    );
    expect(screen.getByText("Paid")).toHaveAttribute("data-tone", "good");
    expect(screen.getByText("Part paid")).toHaveAttribute("data-tone", "info");
    expect(screen.getByText("Due")).toHaveAttribute("data-tone", "warn");
    expect(screen.getByText("Late")).toHaveAttribute("data-tone", "bad");
  });

  it("names repair priorities in words", () => {
    render(
      <>
        <PriorityBadge priority="urgent" />
        <PriorityBadge priority="low" />
      </>,
    );
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("reads a count pill with its label", () => {
    render(<CountPill label="4 homes">4</CountPill>);
    expect(screen.getByText("4 homes")).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("puts the title and count in one heading, with the action beside it", () => {
    render(
      <PageHeader
        title="Properties"
        count={4}
        countLabel="homes"
        description="Every home you let."
        actions={<a href="/homes/new">Add a home</a>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Properties 4 homes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Every home you let.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a home" })).toBeVisible();
  });
});

describe("StatCard", () => {
  it("pairs each label with its figure in a description list", () => {
    const { container } = render(
      <StatGrid>
        <StatCard label="Late rent" value="£525" note="1 tenant" tone="bad" />
        <StatCard label="Rooms let" value="8" suffix="of 11" />
      </StatGrid>,
    );
    const terms = Array.from(container.querySelectorAll("dl > div > dt"));
    expect(terms.map((term) => term.textContent)).toEqual([
      "Late rent",
      "Rooms let",
    ]);
    expect(screen.getByText("£525")).toHaveClass("text-bad");
    expect(screen.getByText("of 11")).toBeInTheDocument();
  });

  it("draws a progress bar with words for screen readers", () => {
    render(<ProgressBar value={3} max={4} label="75% received" />);
    const bar = screen.getByRole("img", { name: "75% received" });
    expect(bar.firstElementChild).toHaveStyle({ width: "75%" });
  });

  it("never draws past 100% or below 0%, even with no rent", () => {
    const { rerender } = render(<ProgressBar value={9} max={4} label="Over" />);
    expect(
      screen.getByRole("img", { name: "Over" }).firstElementChild,
    ).toHaveStyle({ width: "100%" });
    rerender(<ProgressBar value={0} max={0} label="None" />);
    expect(
      screen.getByRole("img", { name: "None" }).firstElementChild,
    ).toHaveStyle({ width: "0%" });
  });
});

describe("SectionCard", () => {
  it("is a section named by its heading", () => {
    render(
      <SectionCard id="owner" title="Owner" action={<a href="/x">View</a>}>
        <p>Demo Owner</p>
      </SectionCard>,
    );
    const section = screen.getByRole("region", { name: "Owner" });
    expect(within(section).getByText("Demo Owner")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "View" })).toBeVisible();
  });
});

describe("FilterTabs and RecordTabs", () => {
  it("marks the chosen filter as the current page", () => {
    render(
      <FilterTabs
        label="Filter rent"
        tabs={[
          { label: "All", href: "/rent", active: true, count: 8 },
          { label: "Late", href: "/rent?status=late", active: false, count: 1 },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Filter rent" });
    expect(within(nav).getByRole("link", { name: "All 8" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Late 1" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("makes each record tab a link", () => {
    render(
      <RecordTabs
        label="Sections of this home"
        tabs={[
          { label: "Overview", href: "/homes/1", active: false },
          {
            label: "Photos",
            href: "/homes/1?tab=photos",
            active: true,
            count: 3,
          },
        ]}
      />,
    );
    const photos = screen.getByRole("link", { name: "Photos 3" });
    expect(photos).toHaveAttribute("href", "/homes/1?tab=photos");
    expect(photos).toHaveAttribute("aria-current", "page");
  });
});

describe("Pagination", () => {
  it("shows nothing for a single page", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} previousHref="/a" nextHref="/b" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers only the links that lead somewhere", () => {
    render(
      <Pagination
        page={1}
        pageCount={3}
        previousHref="/homes"
        nextHref="/homes?page=2"
      />,
    );
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Previous/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/homes?page=2",
    );
  });
});

describe("DataTable", () => {
  it("has a caption, sortable headings and row headers", () => {
    render(
      <DataTable caption="Your homes">
        <thead>
          <tr>
            <SortableHead
              label="Home"
              href="/homes?dir=desc"
              state="ascending"
            />
            <DataTableHead align="right">Rent</DataTableHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <DataTableHead scope="row">Sample House 01</DataTableHead>
            <DataTableCell align="right">£1,150</DataTableCell>
          </tr>
        </tbody>
      </DataTable>,
    );
    const table = screen.getByRole("table", { name: "Your homes" });
    const heading = within(table).getByRole("columnheader", { name: /Home/ });
    expect(heading).toHaveAttribute("aria-sort", "ascending");
    expect(within(heading).getByRole("link")).toHaveAttribute(
      "href",
      "/homes?dir=desc",
    );
    expect(
      within(table).getByRole("rowheader", { name: "Sample House 01" }),
    ).toBeInTheDocument();
  });
});

describe("RecordHeader", () => {
  it("has a back link, the name as the page heading, chips and actions", () => {
    render(
      <RecordHeader
        back={{ href: "/homes", label: "All homes" }}
        title="Sample House 01"
        avatarName="Sample House 01"
        chips={<FactChip>Let by the room · 4 rooms</FactChip>}
        subtitle="1 Example Street, LS6 1AA"
        actions={<a href="/homes/1/edit">Edit home</a>}
      />,
    );
    expect(screen.getByRole("link", { name: "All homes" })).toHaveAttribute(
      "href",
      "/homes",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Sample House 01" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Let by the room · 4 rooms")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit home" })).toBeVisible();
  });
});

describe("ActivityTimeline", () => {
  it("lists events in order with their times", () => {
    render(
      <ActivityTimeline
        items={[
          { id: "1", text: "Payment of £580 recorded", when: "Today, 09:12" },
          {
            id: "2",
            text: "Photo added",
            when: "Fri 13 Nov",
            dateTime: "2026-11-13",
          },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Payment of £580 recorded");
    expect(screen.getByText("Fri 13 Nov")).toHaveAttribute(
      "datetime",
      "2026-11-13",
    );
  });

  it("says so when nothing has happened", () => {
    render(<ActivityTimeline items={[]} emptyText="No activity yet." />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("explains the list and offers one action", () => {
    render(
      <EmptyState
        icon={<svg />}
        title="Add your first home"
        description="Start with one home you let."
        action={<a href="/homes/new">Add a home</a>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Add your first home" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a home" })).toBeVisible();
  });
});

describe("PhotoCard and Avatar", () => {
  it("is one link named by the home, with the status word", () => {
    render(
      <PhotoCard
        href="/homes/1"
        photoUrl={null}
        title="Sample House 01"
        meta="4 rooms"
        chip={{ label: "1 room empty", tone: "warn" }}
      />,
    );
    const link = screen.getByRole("link", { name: /Sample House 01/ });
    expect(link).toHaveAttribute("href", "/homes/1");
    expect(link).toHaveTextContent("1 room empty");
    expect(link).toHaveTextContent("4 rooms");
  });

  it("shows initials, hidden from screen readers", () => {
    render(<Avatar name="Taylor Example" />);
    expect(screen.getByText("TE")).toHaveAttribute("aria-hidden", "true");
  });
});
