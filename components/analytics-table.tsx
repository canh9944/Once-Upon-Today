'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { uiCopy } from '@/lib/ui-i18n';
import { useSite } from './site-context';
import AnalyticsStatus from './analytics-status';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Pagination, PaginationButton, PaginationContent, PaginationEllipsis, PaginationItem } from './ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export type AnalyticsColumn<Row> = {
  id: string;
  label: string;
  value: (row: Row) => string | number | null;
  numeric?: boolean;
  render?: (row: Row) => ReactNode;
};

export default function AnalyticsTable<Row>({ rows, columns, rowKey, defaultSortColumn }: {
  rows: Row[];
  columns: AnalyticsColumn<Row>[];
  rowKey: (row: Row) => string;
  defaultSortColumn?: string;
}) {
  const { locale } = useSite();
  const vi = locale === 'vi';
  const copy = uiCopy(locale);
  const [sort, setSort] = useState<{ id: string; descending: boolean } | undefined>(
    () => defaultSortColumn ? { id: defaultSortColumn, descending: true } : undefined,
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const filtered = rows.filter(row => columns.every(column => {
    const term = filters[column.id]?.trim();
    if (!term) return true;
    const value = column.value(row);
    if (column.numeric) return typeof value === 'number' && value >= Number(term);
    return String(value ?? '').toLocaleLowerCase(locale).includes(term.toLocaleLowerCase(locale));
  }));
  const sortedColumn = columns.find(column => column.id === sort?.id);
  if (sortedColumn && sort) {
    filtered.sort((left, right) => {
      const a = sortedColumn.value(left), b = sortedColumn.value(right);
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      const comparison = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
      return sort.descending ? -comparison : comparison;
    });
  }
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visiblePages = pages <= 7
    ? Array.from({ length: pages }, (_, index) => index + 1)
    : [...new Set([1, current - 1, current, current + 1, pages])]
        .filter(number => number >= 1 && number <= pages)
        .sort((a, b) => a - b);

  return <>
    <Table className="analytics-data-table">
      <TableHeader>
        <TableRow>
          {columns.map(column => {
            const direction = sort?.id === column.id ? sort.descending ? 'descending' : 'ascending' : undefined;
            const Icon = direction === 'descending' ? ArrowDown : direction === 'ascending' ? ArrowUp : ArrowDownUp;
            return <TableHead key={column.id} scope="col" aria-sort={direction}>
              <Button type="button" variant="ghost" size="sm" className="whitespace-nowrap"
                onClick={() => {
                  setSort({ id: column.id, descending: direction ? direction === 'ascending' : !!column.numeric });
                  setPage(1);
                }}>
                {column.label}<Icon aria-hidden="true" size={14} />
              </Button>
            </TableHead>;
          })}
        </TableRow>
        <TableRow>
          {columns.map(column => <TableCell key={column.id}>
            <Input type={column.numeric ? 'number' : 'search'} step={column.numeric ? 'any' : undefined}
              className="min-w-24"
              aria-label={column.numeric ? `${vi ? 'Tối thiểu' : 'Minimum'} ${column.label}` : `${vi ? 'Lọc' : 'Filter'} ${column.label}`}
              placeholder={column.numeric ? (vi ? 'Tối thiểu' : 'Min') : (vi ? 'Lọc' : 'Filter')}
              value={filters[column.id] ?? ''}
              onChange={event => {
                const value = event.target.value;
                setFilters(current => ({ ...current, [column.id]: value }));
                setPage(1);
              }} />
          </TableCell>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.slice((current - 1) * pageSize, current * pageSize).map(row =>
          <TableRow key={rowKey(row)}>{columns.map(column =>
            <TableCell key={column.id} className={column.numeric && typeof column.value(row) === 'number' ? 'analytics-number' : undefined}>
              {column.render ? column.render(row) : column.value(row) ?? '—'}
            </TableCell>
          )}</TableRow>
        )}
        {!filtered.length && <TableRow><TableCell colSpan={columns.length}>
          <AnalyticsStatus state="empty">{rows.length
            ? (vi ? 'Không có dữ liệu phù hợp' : 'No matching data')
            : (vi ? 'Không có dữ liệu trong khoảng ngày này' : 'No data for this date range')}</AnalyticsStatus>
        </TableCell></TableRow>}
      </TableBody>
    </Table>
    {pages > 1 && <Pagination className="mt-4" aria-label={vi ? 'Phân trang bảng thống kê' : 'Statistics table pagination'}>
      <PaginationContent className="flex-wrap justify-center gap-0.5">
        <PaginationItem><PaginationButton className="size-8" aria-label={copy.previousPage} disabled={current === 1}
          onClick={() => setPage(current - 1)}><ChevronLeft aria-hidden="true" /></PaginationButton></PaginationItem>
        {visiblePages.map((number, index) => <Fragment key={number}>
          {index > 0 && number - visiblePages[index - 1] > 1 && <PaginationItem>
            <PaginationEllipsis className="size-8">{copy.morePages}</PaginationEllipsis>
          </PaginationItem>}
          <PaginationItem><PaginationButton className="size-8" isActive={current === number}
            aria-label={`${copy.page} ${number}`} onClick={() => setPage(number)}>{number}</PaginationButton></PaginationItem>
        </Fragment>)}
        <PaginationItem><PaginationButton className="size-8" aria-label={copy.nextPage} disabled={current === pages}
          onClick={() => setPage(current + 1)}><ChevronRight aria-hidden="true" /></PaginationButton></PaginationItem>
      </PaginationContent>
    </Pagination>}
  </>;
}
