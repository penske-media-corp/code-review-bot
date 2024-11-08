import DataTable,
    {
        TableColumn,
        createTheme
    } from 'react-data-table-component';
import React, {
    useCallback,
    useEffect,
    useState,
} from 'react';
import type {
    CodeReview,
    User,
} from '../lib/types';
import Cookies from 'js-cookie';
import ExpandedRow from './ExpandedRow';
import FancyProgress from './FancyProgress';
import {format} from 'date-fns';
import {fetchData} from '../services/fetch';
import {useStateWithDeps} from 'use-state-with-deps';

export interface RenderReviewListProps {
    channel: string;
    status: string;
    user: User;
}

interface UpdateFilterProps {
    channel: string;
    limit: number;
    page: number;
    status: string;
}

// @see https://react-data-table-component.netlify.app/?path=/docs/api-columns--page
const columns: TableColumn<CodeReview>[] = [
    {
        name: 'Date',
        selector: (row: CodeReview) => format(new Date(row.createdAt), 'MMM dd, yyyy'),
        maxWidth: '7em',
    },
    {
        name: 'Owner',
        selector: (row: CodeReview) => row.owner,
        maxWidth: '10em',
    },
    {
        name: 'Jira Ticket',
        format: (row: CodeReview) => row.jiraTicket && <a href={`${row.jiraTicketLinkUrl}`}>{row.jiraTicket}</a>,
        selector: () => true,
        maxWidth: '7em',
    },
    {
        name: 'Pull Request',
        format: (row: CodeReview) => (<div>
                {row.status === 'withdrew' && '(withdrew) '}
                <a href={row.pullRequestLink}>{row.pullRequestLink.replace(/.*\/(.*?\/pull\/\d+)/,'$1')}</a>
            </div>),
        selector: () => true,
        maxWidth: '15em',
    },
    {
        name: 'Slack Link',
        format: (row: CodeReview) => row.slackThreadTs && row.slackPermalink && <a href={row.slackPermalink ?? '#'}>{row.slackThreadTs}</a>,
        selector: () => true,
        maxWidth: '10em',
    },
    {
        name: 'Reviewers',
        selector: (row: CodeReview) => row.reviewers?.join(', ') ?? '',
        wrap: true,
    },
    {
        name: 'Approvers',
        selector: (row: CodeReview) => row.approvers?.join(', ') ?? '',
        wrap: true,
    },
    {
        name: 'Request Changes',
        selector: (row: CodeReview) => row.requestChanges?.join(', ') ?? '',
        wrap: true,
    },
];

// @seet https://react-data-table-component.netlify.app/?path=/docs/pagination-options--options
const paginationComponentOptions = {
    rowsPerPageText: 'Rows per page',
    rangeSeparatorText: 'of',
    selectAllRowsItem: false,
};

const cellPaddings = {
    paddingLeft: '0',
    paddingRight: '0.5em',
}

const customStyles = {
    header: {
        style: {
            backgroundColor: '#555555',
            color: '#eeeeee',
        },
    },
    headRow: {
        style: {
            backgroundColor: '#505050',
            color: 'white',
            fontSize: '1.1em',
        },
    },
    expanderRow: {
        style: {
            backgroundColor: '#252525',
        }
    },
    headCells: {
        style: {
            ...cellPaddings,
        }
    },
    cells: {
        style: {
            ...cellPaddings,
        }
    }
};

createTheme('custom', {
    text: {
        primary: '#c0c0c0',
        secondary: '#c0c0c0',
    },
    background: {
        default: '#303030',
    },
    divider: {
        default: '#505050',
    },
    striped: {
        default: '#353535',
    },
    highlightOnHover: {
        default: '#404040',
    }
}, 'dark');

/**
 *
 * @param {string} channel
 * @param {string} status
 * @param {User} user
 * @constructor
 */
const RenderReviewList = ({channel, status, user}: RenderReviewListProps) => {
    const queryString = new URLSearchParams(window.location.search);
    const [dataSet, setDataSet] = useState([] as CodeReview[]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [pageSize, setPageSize] = useState(Number(Cookies.get('pageSize') || '10'));
    const [currentPage, setCurrentPage] = useStateWithDeps(1, [channel, status]);
    const [expandedRow] = useState(queryString.get('expanded') || Cookies.get('expanded') || '');

    /**
     * Fetch the list of code review.
     *
     * @param {string} channel
     * @param {number} limit
     * @param {number} page
     * @param {string} status
     * @returns void
     */
    const updateFilter = ({channel, limit, page, status}: UpdateFilterProps) => {
        let hasBeenDestroyed = false;

        setLoading(true);
        fetchData(`/api/reviews/${channel}/${status}?limit=${limit}&page=${page}`)
            .then((result) => {
                setLoading(false);
                if (!result || hasBeenDestroyed) {
                    return;
                }
                setDataSet(result.dataset);
                setTotalRows(result.total);
            });

        return () => {
            hasBeenDestroyed = true;
        };
    };

    const handleRowUpdate = useCallback(({data, action}: {data: CodeReview; action: string}) => {
        if (data?.status === status) {
            // If row data status is the same, just need to trigger data refresh and render
            const newDataSet = dataSet.map((row) => row.id === data.id ? data : row);
            setDataSet(newDataSet);
        } else {
            updateFilter({
                channel,
                limit: pageSize,
                page: currentPage,
                status,
            });
        }
    }, [channel, dataSet, currentPage, pageSize, status]);

    const expandedRowComponent = useCallback(({data}: {data: CodeReview}) => (
        <ExpandedRow
            data={data}
            onUpdate={handleRowUpdate}
            user={user}
        />
    ), [handleRowUpdate, user]);

    useEffect(() => {
        return updateFilter({
            channel,
            limit: pageSize,
            page: currentPage,
            status,
        });
    }, [channel, currentPage, pageSize, status]);

    useEffect(() => {
        Cookies.set('pageSize', String(pageSize));
    }, [pageSize]);

    useEffect(() => {
        Cookies.set('expanded', expandedRow);
    }, [expandedRow]);

    return (
        <div id="reviews-list">
            <DataTable
                customStyles={customStyles}
                theme="custom"
                columns={columns}
                data={dataSet}
                progressPending={loading}
                paginationPerPage={pageSize}
                paginationRowsPerPageOptions={[10,15,20,25,30,40,50,100]}
                pagination
                paginationServer
                paginationTotalRows={totalRows}
                paginationComponentOptions={paginationComponentOptions}
                progressComponent={<FancyProgress/>}
                onChangeRowsPerPage={setPageSize}
                onChangePage={setCurrentPage}
                paginationDefaultPage={currentPage}

                fixedHeader
                striped
                highlightOnHover
                dense
                persistTableHead

                conditionalRowStyles={[
                    {
                        when: row => row.status === 'withdrew',
                        classNames: ['withdrew'],
                    }
                ]}

                expandableRows
                expandableRowsComponent={expandedRowComponent}
                expandableRowExpanded={() => expandedRow === 'yes'}
                expandableInheritConditionalStyles={true}
            />
        </div>
    );
};

export default RenderReviewList;
