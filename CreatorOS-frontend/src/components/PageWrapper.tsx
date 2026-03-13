import { motion } from "framer-motion"

export default function PageWrapper({ children }: any) {

  return (

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >

      {children}

    </motion.div>

  )

}