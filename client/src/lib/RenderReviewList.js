import DataTable, {createTheme} from 'react-data-table-component';
import React from 'react';
import {format} from 'date-fns';
import Select from 'react-select';

const RenderReviewList = () => {
    let lastFetch;
    const queryString = new URLSearchParams(window.location.search);
    const status = queryString.get('status') ?? 'pending';
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [totalRows, setTotalRows] = React.useState(0);
    const [perPage, setPerPage] = React.useState(10);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [channelOptions, setChannelOptions] = React.useState([]);
    const [selectedChannel, setSelectedChannel] = React.useState(queryString.get('channel') ?? 'all');
    const [selectPlaceHolder, setSelectPlaceHolder] = React.useState('Code Reviews For All Slack Channels');

    const fetchData = async ({channel, limit, page, status, description}) => {
        // Check last fetch to avoid data refresh during first page loading.
        if (lastFetch && lastFetch === `${channel}-${limit}-${page}-${status}`) {
            return;
        }
        lastFetch = `${channel}-${limit}-${page}-${status}`;
        console.log('fetchData', description, lastFetch)
        setLoading(true);
        fetch(`/api/reviews/${channel}/${status}?limit=${limit}&page=${page}`)
            .then((res) => res.json())
            .then((result) => {
                setData(result.dataset);
                setTotalRows(result.total);
                setLoading(false);
            });
    };

    const handlePageChange = page => {
        console.log('handlePageChange', page);
        setCurrentPage(page);
        fetchData({
            channel: selectedChannel,
            limit: perPage,
            page: page,
            status,
            description: 'handlePageChange',
        });
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        console.log('handlePerRowsChange', newPerPage, page);
        setPerPage(newPerPage);
        fetchData({
            channel: selectedChannel,
            limit: newPerPage,
            page: page,
            status,
            description: 'handlePerRowsChange',
        });
    };

    const handleChannelSelectionChange = (data) => {
        console.log('handleChannelSelectionChange', data);
        const label = channelOptions.find((item) => item.value === data.value).label;
        if (label !== selectPlaceHolder) {
            setSelectedChannel(data.value);
            setSelectPlaceHolder(label);
            fetchData({
                channel: data.value,
                limit: perPage,
                page: currentPage,
                status,
                description: 'handleChannelSelectionChange',
            });
        }
    }

    React.useEffect(() => {
        fetch(`/api/channels`)
            .then((res) => res.json())
            .then((result) => {
                const options = [
                    {
                        label: 'Code Reviews For All Slack Channels',
                        value: 'all',
                    }
                ];

                result.forEach((item) => {
                    const option = {
                        label: `Code Reviews For Channel "#${item.name}"`,
                        value: item.id,
                    };

                    options.push(option);
                    if (selectedChannel !== 'all' && [item.id, item.name].includes(selectedChannel)) {
                        setSelectPlaceHolder(option.label);
                        if (selectedChannel !== item.id) {
                            setSelectedChannel(selectedChannel);
                        }
                    }
                });
                setChannelOptions(options);
            })
            .finally(() => {
                fetchData({
                    channel: selectedChannel,
                    limit: perPage,
                    page: currentPage,
                    status,
                    description: 'useEffect',
                });
            });
    }, []);

    const expandedRowComponent = ({data}) => <pre>{data.note}</pre>;

    // @see https://react-data-table-component.netlify.app/?path=/docs/api-columns--page
    const columns = React.useMemo (() =>[
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
    ]);

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
        },
        expanderRow: {
            style: {
                backgroundColor: '#252525',
            }
        }
    };

    return (
        <div id="reviews-list">
            <Select
                placeholder={selectPlaceHolder}
                options={channelOptions}
                onChange={handleChannelSelectionChange}
            />
            <DataTable
                customStyles={customStyle}
                theme="custom"
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

                expandableRows
                expandableRowsComponent={expandedRowComponent}
                expandableRowDisabled={row => !row.note}
            />
        </div>
    );
};

export default RenderReviewList;
