import Select from 'react-select';
import {logDebug} from '../services/log';

const ButtonLink = ({name, linkUrl}) => {
    const sanitizedName = name.toLowerCase().replace(' ', '-');
    const handleClick = () => {
        window.location.href = linkUrl;
    };

    return (
        <button
            onClick={handleClick}
        >{name}</button>
    );
};

const Navbar = (props) => {
    const {user} = props;

    return (
        <div id="nav">
            <button className="noClick" style={{alignItems: 'center', color: '#000', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', display: 'inline-flex', fontFamily: 'Lato, sans-serif', fontSize: '14px', fontWeight: 600, height: '30px', justifyContent: 'center', textDecoration: 'none'}}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{height: '16px', width: '16px', marginRight: '10px'}} viewBox="0 0 122.8 122.8">
                <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a" />
                <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0" />
                <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d" />
                <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e" />
                </svg>
                <ButtonLink name="Pending" linkUrl="/?status=pending" />
                <ButtonLink name="In Progress" linkUrl="/?status=inprogress" />
                <ButtonLink name={`My Reviews (${user?.displayName})`} linkUrl="/?status=mine" />
            </button>
        </div>
    );
};

export default Navbar;
