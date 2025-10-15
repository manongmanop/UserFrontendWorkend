import '../../App.css';
// import './main.css'
import Sidebar from '../Sidebar Section/Sidebar';
import Body from '../Body Section/body';
import '../style/global.css'

const Main = () => {
  return (
    <div className='container'>
      <Sidebar/>
      <Body/>
      {/* <Account/> */}
    </div>
  )
}

export default Main