import DataTable, {createTheme} from 'react-data-table-component';
import React from 'react';
import {format} from 'date-fns';

const RenderReviewList = () => {
    const [title, setTitle] = React.useState('Code Reviews For All Slack Channels');
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [totalRows, setTotalRows] = React.useState(0);
    const [perPage, setPerPage] = React.useState(10);

    const queryString = new URLSearchParams(window.location.search);
    const channel = queryString.get('channel') ?? 'all';
    const status = queryString.get('status') ?? 'pending';

    const fetchData = async page => {
        setLoading(true);
        fetch(`/api/reviews/${channel}/${status}`)
            .then((res) => res.json())
            .then((result) => {
                setData(result);
                setTotalRows(result.length);
                setLoading(false);
            });
    };

    const handlePageChange = page => {
        // @TODO:
        console.log('handlePageChange', page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        setLoading(true);
        // @TODO:
        console.log('handlePerRowsChange', newPerPage, page);
        setLoading(false);
    };

    React.useEffect(() => {
        fetchData(1);
    }, []);

    React.useEffect(() => {
        if (channel && channel !== 'all') {
            fetch(`/api/channel/${channel}`)
                .then((res) => res.json())
                .then((result) => {
                    if (result.name) {
                        setTitle(`Code Reviews For Slack Channel "#${result.name}"`)
                    }
                });
        }
    }, []);

    // @see https://react-data-table-component.netlify.app/?path=/docs/api-columns--page
    const columns = [
        {
            name: 'Date',
            selector: row => format(new Date(row.createdAt), 'MMM dd, yyyy hh:mmaaaaa'),
        },
        {
            name: 'Owner',
            selector: row => row.owner,
        },
        {
            name: 'Pull Request',
            selector: row => <a href={row.pullRequestLink}>{row.pullRequestLink.replace(/.*penske-media-corp\//,'')}</a>
        },
        {
            name: 'Slack Link',
            selector: row => <a href={row.slackPermalink}>{row.slackThreadTs}</a>
        },
        {
            name: 'Reviewers',
            selector: row => row.reviewers?.join(', ')
        },
        {
            name: 'Approvers',
            selector: row => row.approvers?.join(', ')
        },
    ];

    // @seet https://react-data-table-component.netlify.app/?path=/docs/pagination-options--options
    const paginationComponentOptions = {
        rowsPerPageText: 'Rows per page',
        rangeSeparatorText: 'of',
        selectAllRowsItem: false,
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

    const customStyle = {
        header: {
            style: {
                backgroundColor: '#505050',
                color: '#eeeeee',
            },
        }
    };

    return (
        <div id="reviews-list">
            <DataTable
                customStyles={customStyle}
                theme="custom"
                title={title}
                columns={columns}
                data={data}
                progressPending={loading}
                paginationPerPage={perPage}
                paginationRowsPerPageOptions={[10,20,30,50,100]}
                pagination
                paginationServer
                paginationTotalRows={totalRows}
                paginationComponentOptions={paginationComponentOptions}
                onChangeRowsPerPage={handlePerRowsChange}
                onChangePage={handlePageChange}

                striped
                highlightOnHover
                dense
                persistTableHead
            />
        </div>
    );
};

export default RenderReviewList;
