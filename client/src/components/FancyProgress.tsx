import React from 'react';
import styled, { keyframes } from 'styled-components';

// Copied from https://react-data-table-component.netlify.app/?path=/docs/loading-custom--custom

const rotate360 = keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
`;

const Spinner = styled.div`
    margin: 16px;
    animation: ${rotate360} 1s linear infinite;
    transform: translateZ(0);
    border-top: 2px solid grey;
    border-right: 2px solid grey;
    border-bottom: 2px solid grey;
    border-left: 2px solid #61dafb;
    background: transparent;
    width: 80px;
    height: 80px;
    border-radius: 50%;
`;

const Text = styled.div `
    text-align: center;
`;

const FancyProgress = ({message}: {message?: string}) => (
    <div style={{ padding: '24px' }}>
        <Spinner />
        <Text>{message ?? 'Loading...'}</Text>
    </div>
);

export default FancyProgress;
