import { Link } from "react-router-dom"

function SecondaryButton({content,url='/',logo=null,style}) {
  return (
    <Link to={url} className={`border border-violet-400/30 bg-violet-400/5 hover:bg-violet-400/10 hover:border-violet-300/50 rounded-lg py-2 px-4 flex gap-1.5 transition-colors ${style}`}>
        {logo}{content}
    </Link>
  )
}

export default SecondaryButton
