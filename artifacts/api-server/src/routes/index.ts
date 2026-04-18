import { Router, type IRouter } from "express";
import healthRouter from "./health";
import creatorIqRouter from "./creatoriq";

const router: IRouter = Router();

router.use(healthRouter);
router.use(creatorIqRouter);

export default router;
