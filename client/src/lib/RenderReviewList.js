import DataTable, {createTheme} from 'react-data-table-component';
import React from 'react';
import {format} from 'date-fns';
import Select from 'react-select';

const RenderReviewList = () => {
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

    const fetchData = async (page, perPage) => {
        setLoading(true);
        fetch(`/api/reviews/${selectedChannel}/${status}`)
            .then((res) => res.json())
            .then((result) => {
                setData(result);
                setTotalRows(result.length);
                setLoading(false);
            });
    };

    const handlePageChange = page => {
        setCurrentPage(page);
        // @TODO
        // fetchData(page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        // @TODO
        // fetchData(page, newPerPage);
        setPerPage(newPerPage);
    };

    const handleChannelSelectionChange = (data) => {
        setSelectedChannel(data.value);
        fetchData(1);
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
                let selected;

                result.forEach((item) => {
                    const option = {
                        label: `Code Reviews For Channel "#${item.name}"`,
                        value: item.id,
                    };
                    options.push(option);
                    if (selectedChannel !== 'all' && [item.id, item.name].includes(selectedChannel)) {
                        setSelectPlaceHolder(option.label);
                    }
                });
                setChannelOptions(options);
            });
    }, []);

    React.useEffect(() => {
        fetchData(1);
    }, []);

    const expandedRowComponent = ({data}) => <pre>data.note</pre>;

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
        }
    };

    return (
        <div id="reviews-list">
            <Select
                placeholder={selectPlaceHolder}
                options={channelOptions}
                onChange={handleChannelSelectionChange}
                value={selectedChannel}
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
