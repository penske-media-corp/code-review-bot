import Select from 'react-select';
import styled from 'styled-components';
import {useCallback, useEffect, useState} from 'react';
import {fetchChannel} from '../services/data';

const FilterDiv = styled.div`
      min-width: 350px;
      max-width: 50%;
      flex-grow: 1;
    `;

const ChannelFilter = (props) => {
    const {onSelected, selectedChannel} = props;
    const [channelOptions, setChannelOptions] = useState([]);
    const [selectPlaceHolder, setSelectPlaceHolder] = useState('Code Reviews For All Slack Channels');
    const handleChannelSelectionChange = useCallback((data) => {
        console.log('handleChannelSelectionChange', data);
        const { label } = channelOptions.find(({ value }) => value === data?.value) || {};
        if (label !== selectPlaceHolder) {
            setSelectPlaceHolder(label);
            onSelected && onSelected(data.value);
        }
    });

    useEffect(() => {
        fetchChannel()
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
                            onSelected && onSelected(selectedChannel);
                        }
                    }
                });
                setChannelOptions(options);
            });
    }, []);

    return (
        <FilterDiv>
            <Select id="channel-filter"
                placeholder={selectPlaceHolder}
                options={channelOptions}
                onChange={handleChannelSelectionChange}
                styles={{option: (base) => ({...base, color: '#303030'})}}
            />
        </FilterDiv>
    );
};

export default ChannelFilter;
